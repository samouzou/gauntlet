'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useUserCredits } from '@/hooks/use-user-credits';
import { useToast } from '@/hooks/use-toast';
import { generateScene, saveCharacter } from '@/app/actions/studio-actions';
import { createCheckoutSession } from '@/app/actions/checkout';
import {
  SAMPLE_CHARACTERS,
  SAMPLE_SCENES,
  getSampleCharacter,
  getSampleScene,
} from '@/lib/studio/samples';
import { CharacterCard } from '@/components/studio/CharacterCard';
import { AuthGateDialog } from '@/components/studio/AuthGateDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Clapperboard, UserRoundPlus } from 'lucide-react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Character, Product, Scene } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StudioWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, firestore } = useFirebase();
  const { credits, isLoading: creditsLoading } = useUserCredits();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [authOpen, setAuthOpen] = useState(false);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState<string | null>(null);

  // New character form
  const [charName, setCharName] = useState('');
  const [charDescription, setCharDescription] = useState('');
  const [charStyle, setCharStyle] = useState('Cinematic, photoreal');
  const [charImageUrl, setCharImageUrl] = useState('');

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'), orderBy('credit_amount', 'asc'));
  }, [firestore]);
  const { data: creditPacks } = useCollection<Product>(productsQuery);

  const myCharactersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Avoid composite index requirement for MVP; sort client-side if needed.
    return query(collection(firestore, 'characters'), where('userId', '==', user.uid));
  }, [firestore, user]);
  const { data: myCharacters } = useCollection<Character>(myCharactersQuery);

  const characters = useMemo(() => {
    const mine = (myCharacters || []).map((c) => ({ ...c, isSample: false }));
    return [...SAMPLE_CHARACTERS, ...mine];
  }, [myCharacters]);

  // Prefill from landing deep links
  useEffect(() => {
    const characterId = searchParams.get('character');
    const sceneIdParam = searchParams.get('scene');

    if (characterId) {
      const character = getSampleCharacter(characterId) || characters.find((c) => c.id === characterId);
      if (character) {
        setSelectedCharacterIds([character.id]);
        setPreviewImage(character.imageUrl);
        setPrompt((prev) => prev || `${character.name} in a new scene — ${character.description}`);
        setTitle((prev) => prev || `${character.name} scene`);
      }
    }

    if (sceneIdParam) {
      const scene = getSampleScene(sceneIdParam);
      if (scene) {
        setSceneId(scene.id);
        setPrompt(scene.prompt);
        setTitle(scene.title);
        setSelectedCharacterIds(scene.characterIds);
        setPreviewImage(scene.thumbnailUrl);
        setVideoUrl(null);
        setInteractionId(null);
      }
    }
  }, [searchParams, characters]);

  const selectedCharacters = characters.filter((c) => selectedCharacterIds.includes(c.id));

  const toggleCharacter = (id: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 3)
    );
    const character = characters.find((c) => c.id === id);
    if (character) setPreviewImage(character.imageUrl);
  };

  const requireAuthOrCredits = () => {
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    if ((credits ?? 0) < 1) {
      toast({
        variant: 'destructive',
        title: 'Out of credits',
        description: 'Buy a credit pack below to generate or edit.',
      });
      return false;
    }
    return true;
  };

  const runGenerate = (mode: 'generate' | 'edit') => {
    if (!requireAuthOrCredits()) return;

    const finalPrompt =
      mode === 'edit'
        ? editInstruction.trim()
        : prompt.trim();

    if (finalPrompt.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Add a stronger prompt',
        description: 'Describe the shot, motion, and mood in a sentence or two.',
      });
      return;
    }

    startTransition(async () => {
      try {
        const referenceImageUrls = selectedCharacters
          .map((c) => c.imageUrl)
          .filter(Boolean);

        const result = await generateScene({
          userId: user!.uid,
          prompt: finalPrompt,
          title: title || undefined,
          characterIds: selectedCharacterIds,
          referenceImageUrls,
          previousInteractionId: mode === 'edit' ? interactionId : null,
          sceneId: sceneId?.startsWith('sample-') ? null : sceneId,
          mode,
        });

        setSceneId(result.sceneId);
        setInteractionId(result.interactionId || null);
        setVideoUrl(result.videoDataUrl || result.videoUrl || null);
        toast({
          title: mode === 'edit' ? 'Edit rendered' : 'Scene generated',
          description: '1 credit used. Keep chatting to refine the reel.',
        });
        if (mode === 'edit') setEditInstruction('');
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Generation failed',
          description: err.message || 'Something went wrong with Omni.',
        });
      }
    });
  };

  const handleSaveCharacter = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    startTransition(async () => {
      try {
        const { characterId } = await saveCharacter({
          userId: user.uid,
          name: charName,
          description: charDescription,
          style: charStyle,
          imageUrl: charImageUrl,
        });
        toast({ title: 'Character saved', description: 'Ready to cast in your next scene.' });
        setSelectedCharacterIds((prev) => [...prev, characterId].slice(0, 3));
        setCharName('');
        setCharDescription('');
        setCharImageUrl('');
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Could not save character',
          description: err.message || 'Check the image URL and try again.',
        });
      }
    });
  };

  const handlePurchase = async (priceId: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setIsBuying(priceId);
    try {
      await createCheckoutSession({ userId: user.uid, priceId });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Checkout error',
        description: 'Could not start purchase.',
      });
    } finally {
      setIsBuying(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Studio</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Cast. Shoot. Continue.
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
            Explore freely. Generating or editing a scene with Gemini Omni spends 1 credit.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm border border-border/70 rounded-md px-3 py-2 bg-card/50">
          <Sparkles className="h-4 w-4 text-primary" />
          {user
            ? creditsLoading
              ? '…'
              : `${credits ?? 0} credits`
            : 'Guest · sign in to generate'}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="border-border/70 bg-card/50 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-primary" />
              Scene stage
            </CardTitle>
            <CardDescription>
              {selectedCharacters.length
                ? `Cast: ${selectedCharacters.map((c) => c.name).join(', ')}`
                : 'Select a character to keep continuity across shots.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/60 bg-secondary/40">
              {videoUrl ? (
                <video src={videoUrl} controls className="h-full w-full object-cover" />
              ) : previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImage} alt="" className="h-full w-full object-cover opacity-90" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                  Your reel preview appears here
                </div>
              )}
              {isPending && (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-white/90">Rendering with Gemini Omni…</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Scene title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Rooftop Signal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the shot, motion, lighting, and emotion…"
              />
            </div>

            <Button
              size="lg"
              className="w-full"
              disabled={isPending}
              onClick={() => runGenerate('generate')}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate scene · 1 credit
            </Button>

            {interactionId && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label htmlFor="edit">Conversational edit</Label>
                <Textarea
                  id="edit"
                  rows={3}
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="Make the rain heavier and push the camera left…"
                />
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => runGenerate('edit')}
                >
                  Apply edit · 1 credit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Tabs defaultValue="cast">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cast">Cast</TabsTrigger>
              <TabsTrigger value="create">New character</TabsTrigger>
            </TabsList>
            <TabsContent value="cast" className="mt-4">
              <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {characters.map((character, index) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    index={index}
                    selected={selectedCharacterIds.includes(character.id)}
                    onSelect={() => toggleCharacter(character.id)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Select up to 3 characters. Their images are sent as Omni references for continuity.
              </p>
            </TabsContent>
            <TabsContent value="create" className="mt-4">
              <Card className="border-border/70 bg-card/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <UserRoundPlus className="h-4 w-4 text-primary" />
                    Create character
                  </CardTitle>
                  <CardDescription>
                    Add a reference image URL and description. Saving requires an account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={charName} onChange={(e) => setCharName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={charDescription}
                      onChange={(e) => setCharDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Input value={charStyle} onChange={(e) => setCharStyle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference image URL</Label>
                    <Input
                      type="url"
                      value={charImageUrl}
                      onChange={(e) => setCharImageUrl(e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                  <Button className="w-full" disabled={isPending} onClick={handleSaveCharacter}>
                    Save character
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {user && (credits ?? 0) < 1 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg">Need credits?</CardTitle>
                <CardDescription>Buy a pack to keep generating and editing scenes.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(creditPacks || []).map((pack) => (
                  <div
                    key={pack.stripe_price_id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border border-border/70 px-3 py-2',
                      pack.display_tag && 'border-primary/40'
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{pack.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pack.credit_amount} credits · ${pack.price_usd}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pack.display_tag ? <Badge>{pack.display_tag}</Badge> : null}
                      <Button
                        size="sm"
                        disabled={isBuying === pack.stripe_price_id}
                        onClick={() => handlePurchase(pack.stripe_price_id)}
                      >
                        {isBuying === pack.stripe_price_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Buy'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {(!creditPacks || creditPacks.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No packs configured yet. Add Stripe products in Firestore.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 bg-card/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Sample scenes</CardTitle>
              <CardDescription>Jump into a ready prompt without signing in.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {SAMPLE_SCENES.map((scene: Scene) => (
                <Button
                  key={scene.id}
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/studio?scene=${scene.id}`)}
                >
                  {scene.title}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AuthGateDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
