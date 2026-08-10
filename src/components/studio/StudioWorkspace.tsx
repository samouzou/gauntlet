'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useUserCredits } from '@/hooks/use-user-credits';
import { useToast } from '@/hooks/use-toast';
import { generateCharacter, generateScene, saveCharacter } from '@/app/actions/studio-actions';
import { createCheckoutSession } from '@/app/actions/checkout';
import { uploadCharacterAsset } from '@/lib/studio/upload-character-asset';
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
import { Loader2, Sparkles, Clapperboard, UserRoundPlus, ImagePlus, X } from 'lucide-react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Character, Product, Scene } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StudioWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, firestore, firebaseApp } = useFirebase();
  const { credits, isLoading: creditsLoading } = useUserCredits();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [authOpen, setAuthOpen] = useState(false);
  const [castTab, setCastTab] = useState<'cast' | 'create'>('cast');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState<string | null>(null);

  // New character form — asset is an optional local file upload
  const [charName, setCharName] = useState('');
  const [charDescription, setCharDescription] = useState('');
  const [charStyle, setCharStyle] = useState('Cinematic, photoreal');
  const [charAssetFile, setCharAssetFile] = useState<File | null>(null);
  const [charAssetPreview, setCharAssetPreview] = useState<string | null>(null);

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
        setPreviewImage(character.imageUrl || null);
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
        setPreviewImage(scene.thumbnailUrl || null);
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
    if (character?.imageUrl) setPreviewImage(character.imageUrl);
  };

  const clearCharAsset = useCallback(() => {
    setCharAssetFile(null);
    setCharAssetPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const onCharAssetDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setCharAssetPreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setCharAssetFile(file);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onCharAssetDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
    multiple: false,
  });

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
        // Only user-uploaded stills (https Storage URLs) become Omni image refs.
        // Sample art + text-only cast contribute description → text_to_video.
        const referenceImageUrls = selectedCharacters
          .map((c) => c.imageUrl)
          .filter(
            (url): url is string =>
              typeof url === 'string' &&
              (url.startsWith('https://') || url.startsWith('http://'))
          );

        const castBible = selectedCharacters
          .map(
            (c) =>
              `${c.name}: ${c.description}${c.style ? ` Visual style: ${c.style}.` : ''}${
                c.imageUrl ? '' : ' (no reference still — match from this description).'
              }`
          )
          .join('\n');

        const promptWithCast =
          mode === 'generate' && castBible
            ? `${finalPrompt}\n\nCast / continuity notes:\n${castBible}`
            : finalPrompt;

        const result = await generateScene({
          userId: user!.uid,
          prompt: promptWithCast,
          title: title || undefined,
          characterIds: selectedCharacterIds,
          referenceImageUrls,
          previousInteractionId: mode === 'edit' ? interactionId : null,
          sceneId: sceneId?.startsWith('sample-') ? null : sceneId,
          mode,
        });

        if (!result.ok) {
          toast({
            variant: 'destructive',
            title: 'Generation failed',
            description: result.error || 'Something went wrong with Omni.',
          });
          return;
        }

        setSceneId(result.sceneId);
        setInteractionId(result.interactionId || null);
        setVideoUrl(result.videoUrl || null);
        toast({
          title: mode === 'edit' ? 'Edit rendered' : 'Scene generated',
          description: '1 credit used. Keep chatting to refine the reel.',
        });
        if (mode === 'edit') setEditInstruction('');
      } catch (err: any) {
        const message = String(err?.message || '');
        toast({
          variant: 'destructive',
          title: 'Generation failed',
          description:
            message.includes('unexpected response')
              ? 'The render response was too large or timed out. Try again — videos are now stored in Firebase Storage instead of inline.'
              : message || 'Something went wrong with Omni.',
        });
      }
    });
  };

  const resetCharacterForm = () => {
    setCharName('');
    setCharDescription('');
    setCharStyle('Cinematic, photoreal');
    clearCharAsset();
  };

  const handleGenerateCharacter = () => {
    if (!requireAuthOrCredits()) return;
    if (charName.trim().length < 2 || charDescription.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Add name and description',
        description: 'Describe the character so we can generate a portrait still.',
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await generateCharacter({
          userId: user!.uid,
          name: charName.trim(),
          description: charDescription.trim(),
          style: charStyle.trim() || 'Cinematic portrait',
        });

        if (!result.ok) {
          toast({
            variant: 'destructive',
            title: 'Character generation failed',
            description: result.error,
          });
          return;
        }

        setSelectedCharacterIds((prev) => [...prev, result.characterId].slice(0, 3));
        setPreviewImage(result.imageUrl);
        resetCharacterForm();
        setCastTab('cast');
        toast({
          title: `${result.name} joined the cast`,
          description: '1 credit used. Select them for scene continuity.',
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Character generation failed',
          description: err.message || 'Could not generate a portrait.',
        });
      }
    });
  };

  const handleSaveCharacter = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (charName.trim().length < 2 || charDescription.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Add name and description',
        description: 'A short character bible is enough — the still is optional.',
      });
      return;
    }

    startTransition(async () => {
      try {
        let imageUrl: string | null = null;
        if (charAssetFile) {
          imageUrl = await uploadCharacterAsset({
            app: firebaseApp,
            userId: user.uid,
            file: charAssetFile,
          });
        }

        const { characterId } = await saveCharacter({
          userId: user.uid,
          name: charName.trim(),
          description: charDescription.trim(),
          style: charStyle.trim() || 'Cinematic',
          imageUrl,
        });
        toast({
          title: 'Character saved',
          description: imageUrl
            ? 'Reference still attached for Omni continuity.'
            : 'Saved as text cast — generate from the description.',
        });
        setSelectedCharacterIds((prev) => [...prev, characterId].slice(0, 3));
        if (imageUrl) setPreviewImage(imageUrl);
        resetCharacterForm();
        setCastTab('cast');
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Could not save character',
          description: err.message || 'Upload failed — try another image or save without one.',
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
          <Tabs value={castTab} onValueChange={(v) => setCastTab(v as 'cast' | 'create')}>
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
                Select up to 3. Generated or uploaded stills become Omni image refs; text-only cast
                uses the description.
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
                    Generate a portrait still from a description, or upload your own. Generated cast
                    stays in your list to reuse across scenes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={charName}
                      onChange={(e) => setCharName(e.target.value)}
                      placeholder="Mira Vale"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={charDescription}
                      onChange={(e) => setCharDescription(e.target.value)}
                      placeholder="Look, wardrobe, temperament…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Input
                      value={charStyle}
                      onChange={(e) => setCharStyle(e.target.value)}
                      placeholder="Cinematic neo-noir"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference still (optional upload)</Label>
                    {charAssetPreview ? (
                      <div className="relative overflow-hidden rounded-xl border border-border/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={charAssetPreview}
                          alt="Character reference preview"
                          className="h-40 w-full object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="absolute right-2 top-2 h-8 w-8"
                          onClick={clearCharAsset}
                          aria-label="Remove reference still"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        {...getRootProps()}
                        className={cn(
                          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-secondary/20 px-4 py-6 text-center transition-colors',
                          isDragActive && 'border-primary bg-primary/10'
                        )}
                      >
                        <input {...getInputProps()} />
                        <ImagePlus className="h-5 w-5 text-primary" />
                        <p className="text-sm text-foreground/90">
                          {isDragActive ? 'Drop the still here' : 'Or upload your own still'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPEG / PNG / WebP · under 8MB
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    disabled={isPending}
                    onClick={handleGenerateCharacter}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate character · 1 credit
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={isPending}
                    onClick={handleSaveCharacter}
                  >
                    Save without generating
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
