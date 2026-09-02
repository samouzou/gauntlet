'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useUserCredits } from '@/hooks/use-user-credits';
import { useToast } from '@/hooks/use-toast';
import { generateCharacter, saveCharacter } from '@/app/actions/studio-actions';
import type { GenerateSceneResult } from '@/lib/studio/run-generate-scene';
import { createCheckoutSession } from '@/app/actions/checkout';
import { uploadCharacterAsset } from '@/lib/studio/upload-character-asset';
import {
  SCENE_SOURCE_MAX_BYTES,
  uploadSceneSource,
} from '@/lib/studio/upload-scene-source';
import {
  SAMPLE_CHARACTERS,
  SAMPLE_SCENES,
  getSampleCharacter,
  getSampleScene,
} from '@/lib/studio/samples';
import { CharacterCard } from '@/components/studio/CharacterCard';
import { SceneHistory } from '@/components/studio/SceneHistory';
import { ImageHistory } from '@/components/studio/ImageHistory';
import { StudioNav } from '@/components/studio/StudioNav';
import { AuthGateDialog } from '@/components/studio/AuthGateDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Sparkles,
  Clapperboard,
  UserRoundPlus,
  ImagePlus,
  X,
  History,
  Plus,
  Film,
  RectangleHorizontal,
  RectangleVertical,
  Palette,
  Play,
} from 'lucide-react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type {
  Character,
  ImageAspectRatio,
  Product,
  Scene,
  StudioImage,
  StudioPanel,
  VideoAspectRatio,
} from '@/lib/types';
import type { GenerateImageResult } from '@/lib/studio/run-generate-image';
import { CREDIT_COSTS, creditLabel } from '@/lib/studio/pricing';
import { uploadStudioImage } from '@/lib/studio/upload-studio-image';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

export function StudioWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, firestore, firebaseApp } = useFirebase();
  const { credits, isLoading: creditsLoading } = useUserCredits();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [authOpen, setAuthOpen] = useState(false);
  const [studioPanel, setStudioPanel] = useState<StudioPanel>('video');
  const [castTab, setCastTab] = useState<'cast' | 'create'>('cast');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [imageId, setImageId] = useState<string | null>(null);
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [sourceStillUrl, setSourceStillUrl] = useState<string | null>(null);
  const [isUploadingStill, setIsUploadingStill] = useState(false);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [pendingKind, setPendingKind] = useState<
    'generate' | 'edit' | 'edit_upload' | 'image' | 'restyle' | null
  >(null);
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

  const myScenesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Sort client-side to avoid a composite index for userId + updatedAt.
    return query(collection(firestore, 'scenes'), where('userId', '==', user.uid));
  }, [firestore, user]);
  const { data: myScenes, isLoading: scenesLoading } = useCollection<Scene>(myScenesQuery);

  const myImagesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'images'), where('userId', '==', user.uid));
  }, [firestore, user]);
  const { data: myImages, isLoading: imagesLoading } = useCollection<StudioImage>(myImagesQuery);

  const characters = useMemo(() => {
    const mine = (myCharacters || []).map((c) => ({ ...c, isSample: false }));
    return [...SAMPLE_CHARACTERS, ...mine];
  }, [myCharacters]);

  const loadSceneIntoWorkspace = useCallback((scene: Scene) => {
    setSceneId(scene.id);
    setPrompt(scene.prompt || '');
    setTitle(scene.title || '');
    setSelectedCharacterIds(scene.characterIds || []);
    setVideoUrl(scene.videoUrl || null);
    setInteractionId(scene.interactionId || null);
    setPreviewImage(scene.thumbnailUrl || null);
    setSourceVideoUrl(scene.sourceVideoUrl || null);
    setAspectRatio(scene.aspectRatio === '9:16' ? '9:16' : '16:9');
    setEditInstruction('');
    setStudioPanel('video');
  }, []);

  const startNewScene = useCallback(() => {
    setSceneId(null);
    setPrompt('');
    setTitle('');
    setVideoUrl(null);
    setInteractionId(null);
    setPreviewImage(null);
    setSourceVideoUrl(null);
    setAspectRatio('16:9');
    setEditInstruction('');
    setSelectedCharacterIds([]);
    router.replace('/studio');
  }, [router]);

  // Prefill from landing deep links / history reopen
  useEffect(() => {
    const characterId = searchParams.get('character');
    if (!characterId) return;

    const character = getSampleCharacter(characterId) || characters.find((c) => c.id === characterId);
    if (!character) return;

    setSelectedCharacterIds((prev) => (prev.length ? prev : [character.id]));
    setPreviewImage((prev) => prev || character.imageUrl || null);
    setPrompt((prev) => prev || `${character.name} in a new scene — ${character.description}`);
    setTitle((prev) => prev || `${character.name} scene`);
  }, [searchParams, characters]);

  useEffect(() => {
    const sceneIdParam = searchParams.get('scene');
    if (!sceneIdParam) return;

    const sample = getSampleScene(sceneIdParam);
    if (sample) {
      if (sceneId !== sample.id) {
        loadSceneIntoWorkspace({ ...sample, videoUrl: null, interactionId: null });
      }
      return;
    }

    const owned = (myScenes || []).find((s) => s.id === sceneIdParam);
    if (!owned) return;

    // Load a different scene, or hydrate video once Firestore catches up.
    if (sceneId !== owned.id || (!videoUrl && owned.videoUrl)) {
      loadSceneIntoWorkspace(owned);
    }
  }, [searchParams, myScenes, sceneId, videoUrl, loadSceneIntoWorkspace]);

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

  const onSceneSourceDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      if (!user) {
        setAuthOpen(true);
        return;
      }

      setIsUploadingSource(true);
      void (async () => {
        try {
          const uploaded = await uploadSceneSource({
            app: firebaseApp,
            userId: user.uid,
            file,
          });
          setSourceVideoUrl(uploaded.url);
          // Show the source until Arc returns a reshaped reel.
          if (!videoUrl) setPreviewImage(null);
          toast({
            title: 'Clip ready',
            description: 'Tell Arc what to change, then apply the cut.',
          });
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t add that clip',
            description: err?.message || 'Try a short mp4 or webm under 10 seconds.',
          });
        } finally {
          setIsUploadingSource(false);
        }
      })();
    },
    [user, firebaseApp, videoUrl, toast]
  );

  const {
    getRootProps: getSceneSourceRootProps,
    getInputProps: getSceneSourceInputProps,
    isDragActive: isSceneSourceDragActive,
  } = useDropzone({
    onDrop: onSceneSourceDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
    },
    maxFiles: 1,
    maxSize: SCENE_SOURCE_MAX_BYTES,
    multiple: false,
    disabled: isPending || isUploadingSource,
  });

  const clearSourceVideo = useCallback(() => {
    setSourceVideoUrl(null);
  }, []);

  const requireAuthOrCredits = (needed = 1) => {
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    if ((credits ?? 0) < needed) {
      toast({
        variant: 'destructive',
        title: 'You’re out of credits',
        description:
          needed > 1
            ? `This takes ${needed} credits. Grab a pack below to keep creating.`
            : 'Grab a pack below to keep creating.',
      });
      return false;
    }
    return true;
  };

  const clearSourceStill = useCallback(() => {
    setSourceStillUrl(null);
  }, []);

  const onStudioStillDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      if (!user) {
        setAuthOpen(true);
        return;
      }

      setIsUploadingStill(true);
      void (async () => {
        try {
          const url = await uploadStudioImage({
            app: firebaseApp,
            userId: user.uid,
            file,
          });
          setSourceStillUrl(url);
          if (!stillUrl) setPreviewImage(url);
          toast({
            title: 'Still ready',
            description:
              studioPanel === 'animate'
                ? 'Describe the motion, then animate.'
                : 'Describe the restyle, then generate.',
          });
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t add that still',
            description: err?.message || 'Try a JPEG or PNG under 8MB.',
          });
        } finally {
          setIsUploadingStill(false);
        }
      })();
    },
    [user, firebaseApp, stillUrl, studioPanel, toast]
  );

  const {
    getRootProps: getStillRootProps,
    getInputProps: getStillInputProps,
    isDragActive: isStillDragActive,
  } = useDropzone({
    onDrop: onStudioStillDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
    multiple: false,
    disabled: isPending || isUploadingStill,
  });

  const loadImageIntoWorkspace = useCallback((image: StudioImage) => {
    setImageId(image.id);
    setPrompt(image.prompt || '');
    setTitle(image.title || '');
    setStillUrl(image.imageUrl || null);
    setPreviewImage(image.imageUrl || null);
    setSourceStillUrl(image.sourceImageUrl || null);
    setImageAspectRatio(
      image.aspectRatio === '3:4' ||
        image.aspectRatio === '4:3' ||
        image.aspectRatio === '16:9' ||
        image.aspectRatio === '9:16'
        ? image.aspectRatio
        : '1:1'
    );
    setVideoUrl(null);
    setInteractionId(null);
    setSceneId(null);
    setStudioPanel(image.mode === 'image_to_image' ? 'restyle' : 'image');
  }, []);

  const startNewStill = useCallback(() => {
    setImageId(null);
    setStillUrl(null);
    setSourceStillUrl(null);
    setPrompt('');
    setTitle('');
    setPreviewImage(null);
    setImageAspectRatio('1:1');
  }, []);

  const runGenerateImage = (mode: 'text_to_image' | 'image_to_image') => {
    const cost = CREDIT_COSTS[mode];
    if (!requireAuthOrCredits(cost)) return;

    const finalPrompt = prompt.trim();
    if (finalPrompt.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Tell us a bit more',
        description:
          mode === 'image_to_image'
            ? 'Describe the look, mood, or change you want.'
            : 'A sentence or two about subject, light, and mood goes a long way.',
      });
      return;
    }

    if (mode === 'image_to_image' && !sourceStillUrl && !stillUrl) {
      toast({
        variant: 'destructive',
        title: 'Add a still first',
        description: 'Drop a source image, then describe the restyle.',
      });
      return;
    }

    const sourceForRestyle = sourceStillUrl || stillUrl;

    startTransition(async () => {
      setPendingKind(mode === 'image_to_image' ? 'restyle' : 'image');
      try {
        const response = await fetch('/api/studio/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user!.uid,
            prompt: finalPrompt,
            title: title || undefined,
            sourceImageUrl: mode === 'image_to_image' ? sourceForRestyle : null,
            aspectRatio: imageAspectRatio,
            mode,
          }),
        });

        let result: GenerateImageResult;
        try {
          result = (await response.json()) as GenerateImageResult;
        } catch {
          throw new Error('That still didn’t come through. Try again.');
        }

        if (!result.ok) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t finish the still',
            description: result.error || 'That still didn’t come through. Try again.',
          });
          return;
        }

        setImageId(result.imageId);
        setStillUrl(result.imageUrl);
        setPreviewImage(result.imageUrl);
        toast({
          title: mode === 'image_to_image' ? 'Restyle ready' : 'Still ready',
          description: 'Open Animate to bring it to life, or keep exploring.',
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t finish the still',
          description: err?.message || 'That still didn’t come through. Try again.',
        });
      } finally {
        setPendingKind(null);
      }
    });
  };

  const runGenerate = (mode: 'generate' | 'edit' | 'edit_upload') => {
    const isAnimate = studioPanel === 'animate' && mode === 'generate';
    const pricedCost = isAnimate
      ? CREDIT_COSTS.image_to_video
      : mode === 'edit' || mode === 'edit_upload'
        ? CREDIT_COSTS.video_edit
        : selectedCharacters.some((c) => !c.isSample && c.imageUrl)
          ? CREDIT_COSTS.image_to_video
          : CREDIT_COSTS.text_to_video;

    if (!requireAuthOrCredits(pricedCost)) return;

    const finalPrompt =
      mode === 'edit'
        ? editInstruction.trim()
        : prompt.trim();

    if (finalPrompt.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Tell us a bit more',
        description:
          mode === 'edit_upload'
            ? 'Describe the change you want — a donkey beside them, heavier rain, a closer push-in…'
            : isAnimate
              ? 'Describe the motion, camera, and mood for this still.'
              : 'A sentence or two about the shot, motion, and mood goes a long way.',
      });
      return;
    }

    if (isAnimate && !sourceStillUrl && !stillUrl) {
      toast({
        variant: 'destructive',
        title: 'Add a still first',
        description: 'Upload an image or generate one in Image / Restyle, then animate it.',
      });
      return;
    }

    if (mode === 'edit_upload' && !sourceVideoUrl && !interactionId) {
      toast({
        variant: 'destructive',
        title: 'Add a clip first',
        description: 'Drop a short clip above, then tell Arc how to reshape it.',
      });
      return;
    }

    startTransition(async () => {
      setPendingKind(mode);
      try {
        // Animate uses the source/result still as the Omni reference.
        // Video mode uses user cast stills (samples are display-only).
        const referenceImageUrls =
          mode === 'generate'
            ? isAnimate
              ? [sourceStillUrl || stillUrl].filter(
                  (url): url is string =>
                    typeof url === 'string' &&
                    (url.startsWith('https://') || url.startsWith('http://'))
                )
              : selectedCharacters
                  .filter((c) => !c.isSample)
                  .map((c) => c.imageUrl)
                  .filter(
                    (url): url is string =>
                      typeof url === 'string' &&
                      (url.startsWith('https://') || url.startsWith('http://'))
                  )
            : [];

        const castBible = selectedCharacters
          .map(
            (c) =>
              `${c.name}: ${c.description}${c.style ? ` Visual style: ${c.style}.` : ''}${
                c.imageUrl ? '' : ' (no reference still — match from this description).'
              }`
          )
          .join('\n');

        const promptWithCast =
          mode === 'generate' && !isAnimate && castBible
            ? `${finalPrompt}\n\nCast / continuity notes:\n${castBible}`
            : isAnimate
              ? `${finalPrompt}\n\nAnimate the attached reference still. Keep the subject recognizable.`
              : finalPrompt;

        // Follow-up after an upload edit uses previous_interaction_id (mode edit).
        const resolvedMode =
          mode === 'edit_upload' && interactionId ? 'edit' : mode;

        const response = await fetch('/api/studio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user!.uid,
            prompt: promptWithCast,
            title: title || undefined,
            characterIds: isAnimate ? [] : selectedCharacterIds,
            referenceImageUrls,
            previousInteractionId:
              resolvedMode === 'edit' || (resolvedMode === 'edit_upload' && interactionId)
                ? interactionId
                : null,
            sourceVideoUrl:
              resolvedMode === 'edit_upload' && !interactionId ? sourceVideoUrl : null,
            aspectRatio,
            sceneId: sceneId?.startsWith('sample-') ? null : sceneId,
            mode: resolvedMode,
          }),
        });

        let result: GenerateSceneResult;
        try {
          result = (await response.json()) as GenerateSceneResult;
        } catch {
          throw new Error(
            response.ok
              ? 'That scene didn’t come through. Try again.'
              : 'That took too long. Give it another try in a moment.'
          );
        }

        if (!result.ok) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t finish the scene',
            description: result.error || 'That scene didn’t come through. Try again.',
          });
          return;
        }

        setSceneId(result.sceneId);
        setInteractionId(result.interactionId || null);
        setVideoUrl(result.videoUrl || null);
        router.replace(`/studio?scene=${result.sceneId}`);
        toast({
          title:
            resolvedMode === 'edit' || resolvedMode === 'edit_upload'
              ? 'Cut ready'
              : isAnimate
                ? 'Animation ready'
                : 'Scene ready',
          description: 'Keep talking to shape what happens next.',
        });
        if (resolvedMode === 'edit') setEditInstruction('');
        if (isAnimate) setStudioPanel('video');
      } catch (err: any) {
        const message = String(err?.message || '');
        toast({
          variant: 'destructive',
          title: 'Couldn’t finish the scene',
          description:
            message.includes('unexpected response') || message.includes('Failed to fetch')
              ? 'That took too long. Give it another try in a moment.'
              : message || 'That scene didn’t come through. Try again.',
        });
      } finally {
        setPendingKind(null);
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
    if (!requireAuthOrCredits(CREDIT_COSTS.character)) return;
    if (charName.trim().length < 2 || charDescription.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Add name and description',
        description: 'A clear look and temperament helps the portrait land.',
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
          description: 'Select them for your next scene.',
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t create that character',
          description: err.message || 'Try another description, or upload a still.',
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
            ? 'Their still is ready for the next scene.'
            : 'Saved from the description — you can add a portrait later.',
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


  const panelCopy: Record<StudioPanel, { title: string; subtitle: string }> = {
    video: {
      title: 'Cast. Shoot. Continue.',
      subtitle: 'Pick a cast, describe the moment, and keep shaping what happens next.',
    },
    image: {
      title: 'Still from words.',
      subtitle: 'Describe a frame — Arc paints the still.',
    },
    restyle: {
      title: 'Same subject. New look.',
      subtitle: 'Drop a still and tell Arc how to reshape it.',
    },
    animate: {
      title: 'Still to motion.',
      subtitle: 'Hand Arc an image and describe how it should move.',
    },
    cast: {
      title: 'Build your cast.',
      subtitle: 'Portraits and notes that keep faces consistent across scenes.',
    },
    reels: {
      title: 'Your reels & stills.',
      subtitle: 'Pick up where you left off.',
    },
  };

  const creditsPackCard =
    user && (credits ?? 0) < CREDIT_COSTS.text_to_video ? (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg">Keep creating</CardTitle>
          <CardDescription>Grab a pack when you&apos;re ready for more.</CardDescription>
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
            <p className="text-sm text-muted-foreground">Packs will show up here soon.</p>
          )}
        </CardContent>
      </Card>
    ) : null;

  const castPanel = (
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
          Up to three in a scene. A still helps them stay recognizable; a clear description works
          too.
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
              Sketch someone new with a portrait, or bring your own still. They&apos;ll be ready
              for the next scene.
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
              <Label>Portrait still (optional)</Label>
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
                    {isDragActive ? 'Drop it here' : 'Or drop in your own portrait'}
                  </p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · under 8MB</p>
                </div>
              )}
            </div>
            <Button className="w-full" disabled={isPending} onClick={handleGenerateCharacter}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Create portrait · {creditLabel('character')}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={isPending}
              onClick={handleSaveCharacter}
            >
              Save for later
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const stillSourceField = (
    <div className="space-y-2">
      <Label>Source still</Label>
      {sourceStillUrl || stillUrl ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <ImagePlus className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate text-foreground/90">
              {sourceStillUrl ? 'Source attached' : 'Using latest still'}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearSourceStill}
            disabled={isPending || isUploadingStill}
          >
            Remove
          </Button>
        </div>
      ) : (
        <div
          {...getStillRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-secondary/20 px-4 py-5 text-center transition-colors',
            isStillDragActive && 'border-primary bg-primary/10',
            (isPending || isUploadingStill) && 'pointer-events-none opacity-60'
          )}
        >
          <input {...getStillInputProps()} />
          {isUploadingStill ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-5 w-5 text-primary" />
          )}
          <p className="text-sm text-foreground/90">
            {isStillDragActive ? 'Drop the still here' : 'Drop a still to start'}
          </p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · under 8MB</p>
        </div>
      )}
      {!sourceStillUrl && stillUrl ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setSourceStillUrl(stillUrl)}
        >
          Use current still as source
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Studio</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {panelCopy[studioPanel].title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
            {panelCopy[studioPanel].subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(studioPanel === 'video' || studioPanel === 'animate') && (
            <Button type="button" variant="outline" size="sm" onClick={startNewScene}>
              <Plus className="mr-1.5 h-4 w-4" />
              New scene
            </Button>
          )}
          {(studioPanel === 'image' || studioPanel === 'restyle') && (
            <Button type="button" variant="outline" size="sm" onClick={startNewStill}>
              <Plus className="mr-1.5 h-4 w-4" />
              New still
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm border border-border/70 rounded-md px-3 py-2 bg-card/50">
            <Sparkles className="h-4 w-4 text-primary" />
            {user
              ? creditsLoading
                ? '…'
                : `${credits ?? 0} credits`
              : 'Looking around'}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <StudioNav value={studioPanel} onChange={setStudioPanel} />

        <div className="flex-1 min-w-0 space-y-6">
          {studioPanel === 'video' && (
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <Card className="border-border/70 bg-card/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2">
                    <Clapperboard className="h-5 w-5 text-primary" />
                    Scene stage
                  </CardTitle>
                  <CardDescription>
                    {sourceVideoUrl && !interactionId
                      ? `Hand ${BRAND.aiName} a clip and say what to change.`
                      : selectedCharacters.length
                        ? `With ${selectedCharacters.map((c) => c.name).join(', ')}`
                        : 'Choose who belongs in this scene — or drop in a clip to reshape.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={cn(
                      'relative mx-auto w-full overflow-hidden rounded-xl border border-border/60 bg-secondary/40',
                      aspectRatio === '9:16' ? 'aspect-[9/16] max-w-sm' : 'aspect-video'
                    )}
                  >
                    {videoUrl ? (
                      <video
                        src={videoUrl}
                        controls
                        className="h-full w-full object-contain bg-black"
                      />
                    ) : sourceVideoUrl ? (
                      <video
                        src={sourceVideoUrl}
                        controls
                        className="h-full w-full object-contain bg-black"
                      />
                    ) : previewImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImage}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
                        Your scene will appear here
                      </div>
                    )}
                    {isPending && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-white/90">
                          {pendingKind === 'edit_upload' ||
                          (pendingKind === 'edit' && sourceVideoUrl)
                            ? `${BRAND.aiName} is reshaping your clip…`
                            : 'Creating your scene…'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Format</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                        className="justify-center"
                        disabled={isPending}
                        onClick={() => setAspectRatio('16:9')}
                      >
                        <RectangleHorizontal className="mr-2 h-4 w-4" />
                        Landscape
                      </Button>
                      <Button
                        type="button"
                        variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                        className="justify-center"
                        disabled={isPending}
                        onClick={() => setAspectRatio('9:16')}
                      >
                        <RectangleVertical className="mr-2 h-4 w-4" />
                        Portrait
                      </Button>
                    </div>
                  </div>

                  {!interactionId && (
                    <div className="space-y-2">
                      <Label>Source clip (optional)</Label>
                      {sourceVideoUrl ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <Film className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate text-foreground/90">Clip attached</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={clearSourceVideo}
                            disabled={isPending || isUploadingSource}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div
                          {...getSceneSourceRootProps()}
                          className={cn(
                            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-secondary/20 px-4 py-5 text-center transition-colors',
                            isSceneSourceDragActive && 'border-primary bg-primary/10',
                            (isPending || isUploadingSource) && 'pointer-events-none opacity-60'
                          )}
                        >
                          <input {...getSceneSourceInputProps()} />
                          {isUploadingSource ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <Film className="h-5 w-5 text-primary" />
                          )}
                          <p className="text-sm text-foreground/90">
                            {isSceneSourceDragActive
                              ? 'Drop the clip here'
                              : 'Drop a short clip to reshape'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            mp4 / webm · about 10 seconds · under 200MB
                          </p>
                        </div>
                      )}
                    </div>
                  )}

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
                    <Label htmlFor="prompt">
                      {sourceVideoUrl && !interactionId ? 'What should change' : 'What happens'}
                    </Label>
                    <Textarea
                      id="prompt"
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        sourceVideoUrl && !interactionId
                          ? 'Add a donkey that stays beside them…'
                          : 'A slow push-in on Mira as neon rain hits the rooftop…'
                      }
                    />
                  </div>

                  {sourceVideoUrl && !interactionId ? (
                    <>
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={isPending || isUploadingSource}
                        onClick={() => runGenerate('edit_upload')}
                      >
                        {isPending && pendingKind === 'edit_upload' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Apply cut · {creditLabel('edit_upload')}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={isPending || isUploadingSource}
                        onClick={() => runGenerate('generate')}
                      >
                        Shoot a new scene instead · {creditLabel('text_to_video')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={isPending}
                      onClick={() => runGenerate('generate')}
                    >
                      {isPending && pendingKind === 'generate' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Shoot scene · {creditLabel('text_to_video')}
                    </Button>
                  )}

                  {interactionId && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <Label htmlFor="edit">Keep going</Label>
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
                        {isPending && pendingKind === 'edit' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Apply cut · {creditLabel('video_edit')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {castPanel}
                {creditsPackCard}
                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display">Try a scene</CardTitle>
                    <CardDescription>Jump into a moment and make it yours.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {SAMPLE_SCENES.map((scene: Scene) => (
                      <Button
                        key={scene.id}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          loadSceneIntoWorkspace({
                            ...scene,
                            videoUrl: null,
                            interactionId: null,
                          });
                          router.replace(`/studio?scene=${scene.id}`);
                        }}
                      >
                        {scene.title}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {(studioPanel === 'image' || studioPanel === 'restyle') && (
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <Card className="border-border/70 bg-card/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2">
                    {studioPanel === 'restyle' ? (
                      <Palette className="h-5 w-5 text-primary" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-primary" />
                    )}
                    {studioPanel === 'restyle' ? 'Restyle stage' : 'Image stage'}
                  </CardTitle>
                  <CardDescription>
                    {studioPanel === 'restyle'
                      ? 'Transform a still with a short direction.'
                      : 'Paint a cinematic still from a prompt.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={cn(
                      'relative mx-auto w-full overflow-hidden rounded-xl border border-border/60 bg-secondary/40',
                      imageAspectRatio === '9:16' || imageAspectRatio === '3:4'
                        ? 'aspect-[3/4] max-w-sm'
                        : imageAspectRatio === '16:9'
                          ? 'aspect-video'
                          : 'aspect-square max-w-md'
                    )}
                  >
                    {stillUrl || previewImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={stillUrl || previewImage || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
                        Your still will appear here
                      </div>
                    )}
                    {isPending && (pendingKind === 'image' || pendingKind === 'restyle') && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-white/90">
                          {pendingKind === 'restyle' ? 'Restyling…' : 'Painting your still…'}
                        </p>
                      </div>
                    )}
                  </div>

                  {studioPanel === 'restyle' && stillSourceField}

                  <div className="space-y-2">
                    <Label>Format</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['1:1', 'Square'],
                          ['3:4', 'Portrait'],
                          ['16:9', 'Wide'],
                        ] as const
                      ).map(([value, label]) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={imageAspectRatio === value ? 'default' : 'outline'}
                          disabled={isPending}
                          onClick={() => setImageAspectRatio(value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="still-title">Title</Label>
                    <Input
                      id="still-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Neon alley"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="still-prompt">
                      {studioPanel === 'restyle' ? 'Restyle direction' : 'What to paint'}
                    </Label>
                    <Textarea
                      id="still-prompt"
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        studioPanel === 'restyle'
                          ? 'Oil painting, dusk light, softer wardrobe…'
                          : 'A woman under neon rain, shallow depth of field…'
                      }
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    disabled={isPending || isUploadingStill}
                    onClick={() =>
                      runGenerateImage(
                        studioPanel === 'restyle' ? 'image_to_image' : 'text_to_image'
                      )
                    }
                  >
                    {isPending && (pendingKind === 'image' || pendingKind === 'restyle') ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {studioPanel === 'restyle'
                      ? `Restyle · ${creditLabel('image_to_image')}`
                      : `Generate still · ${creditLabel('text_to_image')}`}
                  </Button>

                  {stillUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSourceStillUrl(stillUrl);
                        setStudioPanel('animate');
                      }}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Animate this still
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {creditsPackCard}
                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display">Recent stills</CardTitle>
                    <CardDescription>Reopen or restyle something you made.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!user ? (
                      <p className="text-sm text-muted-foreground">Sign in to keep your stills.</p>
                    ) : (
                      <ImageHistory
                        images={myImages || []}
                        activeImageId={imageId}
                        isLoading={imagesLoading}
                        onSelect={loadImageIntoWorkspace}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {studioPanel === 'animate' && (
            <div className="max-w-2xl">
              <Card className="border-border/70 bg-card/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Animate stage
                  </CardTitle>
                  <CardDescription>
                    Upload or reuse a still, describe the motion, and shoot.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={cn(
                      'relative mx-auto w-full overflow-hidden rounded-xl border border-border/60 bg-secondary/40',
                      aspectRatio === '9:16' ? 'aspect-[9/16] max-w-sm' : 'aspect-video'
                    )}
                  >
                    {videoUrl ? (
                      <video
                        src={videoUrl}
                        controls
                        className="h-full w-full object-contain bg-black"
                      />
                    ) : sourceStillUrl || stillUrl || previewImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sourceStillUrl || stillUrl || previewImage || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
                        Add a still to animate
                      </div>
                    )}
                    {isPending && pendingKind === 'generate' && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-white/90">Animating your still…</p>
                      </div>
                    )}
                  </div>

                  {stillSourceField}

                  <div className="space-y-2">
                    <Label>Format</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                        disabled={isPending}
                        onClick={() => setAspectRatio('16:9')}
                      >
                        <RectangleHorizontal className="mr-2 h-4 w-4" />
                        Landscape
                      </Button>
                      <Button
                        type="button"
                        variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                        disabled={isPending}
                        onClick={() => setAspectRatio('9:16')}
                      >
                        <RectangleVertical className="mr-2 h-4 w-4" />
                        Portrait
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="animate-title">Title</Label>
                    <Input
                      id="animate-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Rooftop push-in"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="animate-prompt">Motion</Label>
                    <Textarea
                      id="animate-prompt"
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Slow push-in as wind lifts her coat…"
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    disabled={isPending || isUploadingStill}
                    onClick={() => runGenerate('generate')}
                  >
                    {isPending && pendingKind === 'generate' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Animate · {creditLabel('image_to_video')}
                  </Button>
                  {creditsPackCard}
                </CardContent>
              </Card>
            </div>
          )}

          {studioPanel === 'cast' && (
            <div className="max-w-2xl space-y-6">
              {castPanel}
              {creditsPackCard}
            </div>
          )}

          {studioPanel === 'reels' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-2">
                    <History className="h-3.5 w-3.5" />
                    Your reels
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Scenes
                  </h2>
                </div>
                {!user ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-card/20 px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign in to see the stories you&apos;ve started.
                    </p>
                    <Button type="button" variant="secondary" onClick={() => setAuthOpen(true)}>
                      Sign in
                    </Button>
                  </div>
                ) : (
                  <SceneHistory
                    scenes={myScenes || []}
                    activeSceneId={sceneId}
                    isLoading={scenesLoading}
                    onSelect={(scene) => {
                      loadSceneIntoWorkspace(scene);
                      setStudioPanel('video');
                      router.replace(`/studio?scene=${scene.id}`);
                    }}
                  />
                )}
              </section>

              <section className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Stills</p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Images
                  </h2>
                </div>
                {!user ? (
                  <p className="text-sm text-muted-foreground">Sign in to keep your stills.</p>
                ) : (
                  <ImageHistory
                    images={myImages || []}
                    activeImageId={imageId}
                    isLoading={imagesLoading}
                    onSelect={loadImageIntoWorkspace}
                  />
                )}
              </section>
              {creditsPackCard}
            </div>
          )}
        </div>
      </div>

      <AuthGateDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
