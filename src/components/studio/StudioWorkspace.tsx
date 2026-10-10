'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useUserCredits } from '@/hooks/use-user-credits';
import { useToast } from '@/hooks/use-toast';
import { generateCharacter, saveCharacter } from '@/app/actions/studio-actions';
import type { GenerateSceneResult } from '@/lib/studio/run-generate-scene';
import { createCheckoutSession, getCreditPacks } from '@/app/actions/checkout';
import { uploadCharacterAsset } from '@/lib/studio/upload-character-asset';
import {
  SCENE_SOURCE_MAX_BYTES,
  uploadSceneSource,
} from '@/lib/studio/upload-scene-source';
import { SAMPLE_CHARACTERS, getSampleCharacter } from '@/lib/studio/samples';
import { hasTemplatePlaceholders, type AdTemplate } from '@/lib/studio/ad-templates';
import type { MarketingExample } from '@/components/landing/MarketingFeed';
import { AdTemplates } from '@/components/studio/AdTemplates';
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
  Download,
} from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import type {
  Character,
  ImageAspectRatio,
  Scene,
  StudioImage,
  StudioPanel,
  VideoAspectRatio,
} from '@/lib/types';
import type { GenerateImageResult } from '@/lib/studio/run-generate-image';
import {
  CREDIT_COSTS,
  SEGMENT_SECONDS,
  VIDEO_LENGTHS,
  creditLabel,
  formatCredits,
  videoLengthCost,
  type VideoLength,
} from '@/lib/studio/pricing';
import { uploadStudioImage } from '@/lib/studio/upload-studio-image';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

function downloadHref(url: string, filename: string) {
  return `/api/download?${new URLSearchParams({ url, filename })}`;
}

export function StudioWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, firestore, firebaseApp } = useFirebase();
  const { credits, unlimited, isLoading: creditsLoading } = useUserCredits();
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
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('9:16');
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [imageId, setImageId] = useState<string | null>(null);
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [sourceStillUrl, setSourceStillUrl] = useState<string | null>(null);
  const [isUploadingStill, setIsUploadingStill] = useState(false);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [pendingKind, setPendingKind] = useState<
    'generate' | 'edit' | 'edit_upload' | 'extend' | 'image' | 'restyle' | null
  >(null);
  const [targetLength, setTargetLength] = useState<VideoLength>(10);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [chainProgress, setChainProgress] = useState<{ part: number; total: number } | null>(
    null
  );
  const [isBuying, setIsBuying] = useState<number | null>(null);

  // New character form — asset is an optional local file upload
  const [charName, setCharName] = useState('');
  const [charDescription, setCharDescription] = useState('');
  const [charStyle, setCharStyle] = useState('Photoreal, natural light');
  const [charAssetFile, setCharAssetFile] = useState<File | null>(null);
  const [charAssetPreview, setCharAssetPreview] = useState<string | null>(null);

  const [creditPacks, setCreditPacks] = useState<{ credits: number; cents: number }[] | null>(
    null
  );
  useEffect(() => {
    let cancelled = false;
    void getCreditPacks().then((packs) => {
      if (!cancelled) setCreditPacks(packs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Scene the user just closed with "New scene"; the URL still names it until router.replace lands.
  const dismissedSceneRef = useRef<string | null>(null);

  const loadSceneIntoWorkspace = useCallback((scene: Scene) => {
    dismissedSceneRef.current = null;
    setSceneId(scene.id);
    setPrompt(scene.prompt || '');
    setTitle(scene.title || '');
    setSelectedCharacterIds(scene.characterIds || []);
    setVideoUrl(scene.videoUrl || null);
    setDurationSeconds(scene.durationSeconds ?? (scene.videoUrl ? SEGMENT_SECONDS : null));
    setInteractionId(scene.interactionId || null);
    setPreviewImage(scene.thumbnailUrl || null);
    setSourceVideoUrl(scene.sourceVideoUrl || null);
    setAspectRatio(scene.aspectRatio === '9:16' ? '9:16' : '16:9');
    setEditInstruction('');
    setStudioPanel('video');
  }, []);

  const startNewScene = useCallback(() => {
    dismissedSceneRef.current = searchParams.get('scene');
    setSceneId(null);
    setPrompt('');
    setTitle('');
    setVideoUrl(null);
    setDurationSeconds(null);
    setInteractionId(null);
    setPreviewImage(null);
    setSourceVideoUrl(null);
    setAspectRatio('9:16');
    setEditInstruction('');
    setSelectedCharacterIds([]);
    router.replace('/studio');
  }, [router, searchParams]);

  // Prefill from landing deep links / history reopen
  useEffect(() => {
    const characterId = searchParams.get('character');
    if (!characterId) return;

    const character = getSampleCharacter(characterId) || characters.find((c) => c.id === characterId);
    if (!character) return;

    setSelectedCharacterIds((prev) => (prev.length ? prev : [character.id]));
    setPreviewImage((prev) => prev || character.imageUrl || null);
    setPrompt(
      (prev) => prev || `${character.name} talks to the camera about [your product or offer].`
    );
    setTitle((prev) => prev || `${character.name} ad`);
  }, [searchParams, characters]);

  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    if (!promptParam) return;
    setPrompt((prev) => prev || promptParam.slice(0, 4000));
    setAspectRatio(searchParams.get('ratio') === '16:9' ? '16:9' : '9:16');
  }, [searchParams]);

  useEffect(() => {
    const sceneIdParam = searchParams.get('scene');
    if (!sceneIdParam || sceneIdParam === dismissedSceneRef.current) return;

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
          // Show the source until the remix comes back.
          if (!videoUrl) setPreviewImage(null);
          toast({
            title: 'Footage ready',
            description: 'Say what to change, then remix it.',
          });
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t add that footage',
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
    if (!unlimited && (credits ?? 0) < needed) {
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
            title: 'Photo ready',
            description:
              studioPanel === 'animate'
                ? 'Describe the motion, then generate the video.'
                : 'Describe the change, then remix it.',
          });
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t add that photo',
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

  const blockOnPlaceholders = (text: string) => {
    if (!hasTemplatePlaceholders(text)) return false;
    toast({
      variant: 'destructive',
      title: 'Fill in the template first',
      description: 'Replace the [bracketed] parts with details about your business.',
    });
    return true;
  };

  const applyTemplate = (template: AdTemplate) => {
    if (template.panel === 'image') {
      startNewStill();
      if (template.imageAspectRatio) setImageAspectRatio(template.imageAspectRatio);
    } else if (template.panel === 'video') {
      if (sceneId || videoUrl) startNewScene();
    } else {
      setVideoUrl(null);
      setSceneId(null);
      setInteractionId(null);
      setDurationSeconds(null);
    }
    setStudioPanel(template.panel);
    setTitle(template.title);
    setPrompt(template.prompt);
    setAspectRatio(template.aspectRatio);
    if (template.length) setTargetLength(template.length);
  };

  const applyExample = (example: MarketingExample) => {
    if (sceneId || videoUrl) startNewScene();
    setStudioPanel('video');
    setTitle(`${example.business} ad`);
    setPrompt(example.prompt);
    setAspectRatio('9:16');
    setTargetLength(10);
  };

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
            ? 'Describe the look, setting, or change you want.'
            : 'A sentence or two about your product, the setting, and the mood goes a long way.',
      });
      return;
    }
    if (blockOnPlaceholders(finalPrompt)) return;

    if (mode === 'image_to_image' && !sourceStillUrl && !stillUrl) {
      toast({
        variant: 'destructive',
        title: 'Add a photo first',
        description: 'Drop a product or brand photo, then describe the change.',
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
          throw new Error('That image didn’t come through. Try again.');
        }

        if (!result.ok) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t finish the image',
            description: result.error || 'That image didn’t come through. Try again.',
          });
          return;
        }

        setImageId(result.imageId);
        setStillUrl(result.imageUrl);
        setPreviewImage(result.imageUrl);
        toast({
          title: mode === 'image_to_image' ? 'Remix ready' : 'Image ready',
          description: 'Download it, or turn it into a video ad.',
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t finish the image',
          description: err?.message || 'That image didn’t come through. Try again.',
        });
      } finally {
        setPendingKind(null);
      }
    });
  };

  const postGenerate = async (body: Record<string, unknown>): Promise<GenerateSceneResult> => {
    const response = await fetch('/api/studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    try {
      return (await response.json()) as GenerateSceneResult;
    } catch {
      throw new Error(
        response.ok
          ? 'That ad didn’t come through. Try again.'
          : 'That took too long. Give it another try in a moment.'
      );
    }
  };

  const applySceneResult = (result: Extract<GenerateSceneResult, { ok: true }>) => {
    setSceneId(result.sceneId);
    setInteractionId(result.interactionId || null);
    setVideoUrl(result.videoUrl || null);
    setDurationSeconds(result.durationSeconds ?? SEGMENT_SECONDS);
    router.replace(`/studio?scene=${result.sceneId}`);
  };

  const sceneLength = durationSeconds ?? (videoUrl ? SEGMENT_SECONDS : 0);
  const canExtend =
    Boolean(videoUrl && sceneId && !sceneId.startsWith('sample-')) &&
    sceneLength < VIDEO_LENGTHS[VIDEO_LENGTHS.length - 1];
  // Conversational edits only see the last 10s part, so they'd drop the rest of a long scene.
  const canEditCut = sceneLength <= SEGMENT_SECONDS + 1;

  const runExtend = () => {
    if (!canExtend || !sceneId) return;
    if (!requireAuthOrCredits(CREDIT_COSTS.video_extend)) return;
    const direction = editInstruction.trim() || prompt.trim();
    if (direction.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Tell us what happens next',
        description: 'A sentence about where the action goes next helps the new part land.',
      });
      return;
    }

    startTransition(async () => {
      setPendingKind('extend');
      try {
        const result = await postGenerate({
          userId: user!.uid,
          prompt: direction,
          sceneId,
          aspectRatio,
          mode: 'extend',
        });
        if (!result.ok) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t extend the ad',
            description: result.error || 'That part didn’t come through. Try again.',
          });
          return;
        }
        applySceneResult(result);
        setEditInstruction('');
        toast({
          title: `Ad is now ${result.durationSeconds ?? sceneLength + SEGMENT_SECONDS}s`,
          description: 'Keep extending, or download it.',
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t extend the ad',
          description: err?.message || 'That part didn’t come through. Try again.',
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
    const startsNewCut = mode === 'generate' || (mode === 'edit_upload' && !interactionId);
    const parts = startsNewCut ? targetLength / SEGMENT_SECONDS : 1;
    const totalCost = pricedCost + (parts - 1) * CREDIT_COSTS.video_extend;

    if (!requireAuthOrCredits(totalCost)) return;

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
            ? 'Describe the change you want — a new background, brighter colors, a closer shot…'
            : isAnimate
              ? 'Describe the motion, camera, and mood for this photo.'
              : 'A sentence or two about your product, the shot, and the mood goes a long way.',
      });
      return;
    }
    if (blockOnPlaceholders(finalPrompt)) return;

    if (isAnimate && !sourceStillUrl && !stillUrl) {
      toast({
        variant: 'destructive',
        title: 'Add a photo first',
        description: 'Upload a product or brand photo, or create one in Image ad, then turn it into video.',
      });
      return;
    }

    if (mode === 'edit_upload' && !sourceVideoUrl && !interactionId) {
      toast({
        variant: 'destructive',
        title: 'Add footage first',
        description: 'Drop a short clip above, then say how to remix it.',
      });
      return;
    }

    startTransition(async () => {
      setPendingKind(mode);
      setChainProgress(parts > 1 ? { part: 1, total: parts } : null);
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

        const result = await postGenerate({
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
        });

        if (!result.ok) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t finish the ad',
            description: result.error || 'That ad didn’t come through. Try again.',
          });
          return;
        }

        applySceneResult(result);

        for (let part = 2; part <= parts; part += 1) {
          setChainProgress({ part, total: parts });
          const next = await postGenerate({
            userId: user!.uid,
            prompt: `Continue the action naturally. ${finalPrompt}`,
            sceneId: result.sceneId,
            aspectRatio,
            mode: 'extend',
          });
          if (!next.ok) {
            toast({
              variant: 'destructive',
              title: `Stopped at ${(part - 1) * SEGMENT_SECONDS}s`,
              description: `${next.error || 'The next part didn’t come through.'} Your ad so far is saved; use Extend to keep going.`,
            });
            return;
          }
          applySceneResult(next);
        }

        toast({
          title:
            resolvedMode === 'edit' || resolvedMode === 'edit_upload'
              ? 'Remix ready'
              : 'Ad ready',
          description: 'Download it, or keep refining below.',
        });
        if (resolvedMode === 'edit') setEditInstruction('');
        if (isAnimate) setStudioPanel('video');
      } catch (err: any) {
        const message = String(err?.message || '');
        toast({
          variant: 'destructive',
          title: 'Couldn’t finish the ad',
          description:
            message.includes('unexpected response') || message.includes('Failed to fetch')
              ? 'That took too long. Give it another try in a moment.'
              : message || 'That ad didn’t come through. Try again.',
        });
      } finally {
        setPendingKind(null);
        setChainProgress(null);
      }
    });
  };

  const lengthPicker = (
    <div className="space-y-2">
      <Label>Length</Label>
      <div className="grid grid-cols-4 gap-2">
        {VIDEO_LENGTHS.map((seconds) => (
          <Button
            key={seconds}
            type="button"
            size="sm"
            variant={targetLength === seconds ? 'default' : 'outline'}
            disabled={isPending}
            onClick={() => setTargetLength(seconds)}
          >
            {seconds}s
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        1 credit per second · rendered in 10-second parts that continue the same shot.
      </p>
    </div>
  );

  const formatPicker = (
    <div className="space-y-2">
      <Label>Format</Label>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['9:16', 'Vertical', 'Reels, TikTok, Shorts', RectangleVertical],
            ['16:9', 'Widescreen', 'YouTube, web, TV', RectangleHorizontal],
          ] as const
        ).map(([value, label, hint, Icon]) => (
          <Button
            key={value}
            type="button"
            variant={aspectRatio === value ? 'default' : 'outline'}
            className="h-auto flex-col gap-0.5 py-2"
            disabled={isPending}
            onClick={() => setAspectRatio(value)}
          >
            <span className="flex items-center">
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </span>
            <span className="text-[11px] font-normal opacity-75">{hint}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  const pendingVideoLabel = chainProgress
    ? `Generating part ${chainProgress.part} of ${chainProgress.total}…`
    : pendingKind === 'extend'
      ? 'Adding 10 more seconds…'
      : null;

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
        description: 'A clear look and personality helps the portrait land.',
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
            title: 'Couldn’t create that presenter',
            description: result.error,
          });
          return;
        }

        setSelectedCharacterIds((prev) => [...prev, result.characterId].slice(0, 3));
        setPreviewImage(result.imageUrl);
        resetCharacterForm();
        setCastTab('cast');
        toast({
          title: `${result.name} is ready`,
          description: 'Select them for your next ad.',
        });
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t create that presenter',
          description: err.message || 'Try another description, or upload a photo.',
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
        description: 'A short description is enough — the photo is optional.',
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
          title: 'Presenter saved',
          description: imageUrl
            ? 'Their photo is ready for your next ad.'
            : 'Saved from the description — you can add a photo later.',
        });
        setSelectedCharacterIds((prev) => [...prev, characterId].slice(0, 3));
        if (imageUrl) setPreviewImage(imageUrl);
        resetCharacterForm();
        setCastTab('cast');
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Could not save presenter',
          description: err.message || 'Upload failed — try another image or save without one.',
        });
      }
    });
  };

  const handlePurchase = async (packCredits: number) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setIsBuying(packCredits);
    try {
      const { url } = await createCheckoutSession({ userId: user.uid, credits: packCredits });
      window.location.assign(url);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Checkout error',
        description: 'Could not start purchase.',
      });
      setIsBuying(null);
    }
  };


  const panelCopy: Record<StudioPanel, { title: string; subtitle: string }> = {
    video: {
      title: 'Create a video ad.',
      subtitle:
        'Start from a template or describe your product and offer. Get a 10 to 40 second ad for Reels, TikTok, Shorts and YouTube.',
    },
    image: {
      title: 'Create an image ad.',
      subtitle: 'Describe the shot and get a static creative for feeds, stories and display.',
    },
    restyle: {
      title: 'Remix an image.',
      subtitle: 'Drop in a product photo or past creative and say how to change it.',
    },
    animate: {
      title: 'Turn a photo into a video ad.',
      subtitle: 'Upload a product or brand photo and describe how it should move.',
    },
    cast: {
      title: 'Your presenters.',
      subtitle:
        'Save the faces of your brand — you, your team, or an AI spokesperson — and reuse them in every ad.',
    },
    reels: {
      title: 'Your ads.',
      subtitle: 'Everything you’ve made, ready to download or keep refining.',
    },
  };

  const creditsPackCard =
    user && !unlimited && (credits ?? 0) < CREDIT_COSTS.text_to_video ? (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg">Keep creating</CardTitle>
          <CardDescription>
            1 credit = 1 second of video. Credits never expire.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(creditPacks || []).map((pack, index) => (
            <div
              key={pack.credits}
              className={cn(
                'flex items-center justify-between rounded-lg border border-border/70 px-3 py-2',
                index === 1 && 'border-primary/40'
              )}
            >
              <div>
                <p className="font-medium text-sm">
                  {pack.credits} credits · ${(pack.cents / 100).toFixed(pack.cents % 100 ? 2 : 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  About {Math.floor(pack.credits / SEGMENT_SECONDS)} ten-second videos
                </p>
              </div>
              <div className="flex items-center gap-2">
                {index === 1 ? <Badge>Popular</Badge> : null}
                <Button
                  size="sm"
                  disabled={isBuying !== null}
                  onClick={() => handlePurchase(pack.credits)}
                >
                  {isBuying === pack.credits ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Buy'
                  )}
                </Button>
              </div>
            </div>
          ))}
          {creditPacks === null && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {creditPacks?.length === 0 && (
            <p className="text-sm text-muted-foreground">Packs will show up here soon.</p>
          )}
        </CardContent>
      </Card>
    ) : null;

  const castPanel = (
    <Tabs value={castTab} onValueChange={(v) => setCastTab(v as 'cast' | 'create')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="cast">Presenters</TabsTrigger>
        <TabsTrigger value="create">New presenter</TabsTrigger>
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
          Optional. Up to three per ad. A photo keeps them recognizable; a clear description works
          too.
        </p>
      </TabsContent>
      <TabsContent value="create" className="mt-4">
        <Card className="border-border/70 bg-card/40">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <UserRoundPlus className="h-4 w-4 text-primary" />
              Add a presenter
            </CardTitle>
            <CardDescription>
              Generate an AI spokesperson from a description, or upload a photo of you or your
              team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder="Maya"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={charDescription}
                onChange={(e) => setCharDescription(e.target.value)}
                placeholder="Age, look, wardrobe, how they talk…"
              />
            </div>
            <div className="space-y-2">
              <Label>Style</Label>
              <Input
                value={charStyle}
                onChange={(e) => setCharStyle(e.target.value)}
                placeholder="Selfie-style phone video"
              />
            </div>
            <div className="space-y-2">
              <Label>Photo (optional)</Label>
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
                    {isDragActive ? 'Drop it here' : 'Or drop in a photo of you or your team'}
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
      <Label>Product or brand photo</Label>
      {sourceStillUrl || stillUrl ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <ImagePlus className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate text-foreground/90">
              {sourceStillUrl ? 'Photo attached' : 'Using your latest image'}
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
            {isStillDragActive ? 'Drop the photo here' : 'Drop a product or brand photo'}
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
          Use your current image
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
              New ad
            </Button>
          )}
          {(studioPanel === 'image' || studioPanel === 'restyle') && (
            <Button type="button" variant="outline" size="sm" onClick={startNewStill}>
              <Plus className="mr-1.5 h-4 w-4" />
              New image
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm border border-border/70 rounded-md px-3 py-2 bg-card/50">
            <Sparkles className="h-4 w-4 text-primary" />
            {user
              ? creditsLoading
                ? '…'
                : unlimited
                  ? 'Unlimited'
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
                    Video ad
                  </CardTitle>
                  <CardDescription>
                    {sourceVideoUrl && !interactionId
                      ? 'Say what to change in your footage.'
                      : selectedCharacters.length
                        ? `Featuring ${selectedCharacters.map((c) => c.name).join(', ')}`
                        : 'Describe your ad, or start from a template.'}
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
                        Your ad will appear here
                      </div>
                    )}
                    {isPending && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-white/90">
                          {pendingVideoLabel ??
                            (pendingKind === 'edit_upload' ||
                            (pendingKind === 'edit' && sourceVideoUrl)
                              ? 'Remixing your footage…'
                              : 'Creating your ad…')}
                        </p>
                        {(chainProgress || pendingKind === 'extend') && (
                          <p className="text-xs text-white/70">
                            Each 10-second part takes a minute or two. Keep this tab open.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {videoUrl && !isPending && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={downloadHref(videoUrl, title || 'reelwright-ad')} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download ad
                      </a>
                    </Button>
                  )}

                  {formatPicker}

                  {lengthPicker}

                  {!interactionId && (
                    <div className="space-y-2">
                      <Label>Remix your own footage (optional)</Label>
                      {sourceVideoUrl ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <Film className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate text-foreground/90">Footage attached</span>
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
                              ? 'Drop the footage here'
                              : 'Drop a clip you already have'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            mp4 / webm · about 10 seconds · under 200MB
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="title">Ad name</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Summer sale reel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prompt">
                      {sourceVideoUrl && !interactionId ? 'What should change' : 'Describe your ad'}
                    </Label>
                    <Textarea
                      id="prompt"
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        sourceVideoUrl && !interactionId
                          ? 'Swap the background for a beach at sunset, keep the product the same…'
                          : 'Vertical ad for our cold brew: a slow pour over ice, condensation on the can, friends sharing it on a sunny patio. Upbeat music. No text on screen.'
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
                        Remix footage · {formatCredits(videoLengthCost(targetLength))}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={isPending || isUploadingSource}
                        onClick={() => runGenerate('generate')}
                      >
                        Generate a new ad instead · {formatCredits(videoLengthCost(targetLength))}
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
                      Generate {targetLength}s ad · {formatCredits(videoLengthCost(targetLength))}
                    </Button>
                  )}

                  {(interactionId || canExtend) && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="edit">Refine or extend</Label>
                        {videoUrl && sceneLength > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Ad is {sceneLength}s
                          </span>
                        )}
                      </div>
                      <Textarea
                        id="edit"
                        rows={3}
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder={
                          canEditCut
                            ? 'Make it brighter, add a second customer, or say what happens next…'
                            : 'What happens next…'
                        }
                      />
                      <div className={cn('grid gap-2', interactionId && canEditCut && 'sm:grid-cols-2')}>
                        {interactionId && canEditCut && (
                          <Button
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => runGenerate('edit')}
                          >
                            {isPending && pendingKind === 'edit' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Apply change · {creditLabel('video_edit')}
                          </Button>
                        )}
                        {canExtend && (
                          <Button variant="secondary" disabled={isPending} onClick={runExtend}>
                            {isPending && pendingKind === 'extend' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Extend +10s · {creditLabel('video_extend')}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {canEditCut
                          ? 'Apply change reworks this take. Extend adds 10 more seconds, up to 40s.'
                          : canExtend
                            ? 'Extend adds 10 more seconds, up to 40s.'
                            : 'This ad is at the 40s max. Download it, or make a new one.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <AdTemplates
                  panel="video"
                  disabled={isPending}
                  onPickTemplate={applyTemplate}
                  onPickExample={applyExample}
                />
                {creditsPackCard}
                {castPanel}
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
                    {studioPanel === 'restyle' ? 'Remix' : 'Image ad'}
                  </CardTitle>
                  <CardDescription>
                    {studioPanel === 'restyle'
                      ? 'Change a product photo or creative with a short direction.'
                      : 'Generate a static ad creative from a description.'}
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
                        Your image will appear here
                      </div>
                    )}
                    {isPending && (pendingKind === 'image' || pendingKind === 'restyle') && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-white/90">
                          {pendingKind === 'restyle' ? 'Remixing…' : 'Creating your image…'}
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
                    <Label htmlFor="still-title">Ad name</Label>
                    <Input
                      id="still-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Spring launch post"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="still-prompt">
                      {studioPanel === 'restyle' ? 'What to change' : 'Describe the image'}
                    </Label>
                    <Textarea
                      id="still-prompt"
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        studioPanel === 'restyle'
                          ? 'Put the product on a marble counter with soft morning light…'
                          : 'Flat lay of our skincare set on pink stone, soft shadows, fresh flowers…'
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
                      ? `Remix · ${creditLabel('image_to_image')}`
                      : `Generate image · ${creditLabel('text_to_image')}`}
                  </Button>

                  {stillUrl && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" asChild>
                        <a href={downloadHref(stillUrl, title || 'reelwright-image')} download>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSourceStillUrl(stillUrl);
                          setStudioPanel('animate');
                        }}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Turn into video
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {studioPanel === 'image' && (
                  <AdTemplates panel="image" disabled={isPending} onPickTemplate={applyTemplate} />
                )}
                {creditsPackCard}
                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display">Recent images</CardTitle>
                    <CardDescription>Reopen or remix something you made.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!user ? (
                      <p className="text-sm text-muted-foreground">Sign in to keep your images.</p>
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
            <div className="max-w-2xl space-y-6">
              <Card className="border-border/70 bg-card/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Photo to video
                  </CardTitle>
                  <CardDescription>
                    Upload a product or brand photo, describe the motion, and generate.
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
                        Add a photo to bring to life
                      </div>
                    )}
                    {isPending && pendingKind === 'generate' && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-white/90">
                          {pendingVideoLabel ?? 'Bringing your photo to life…'}
                        </p>
                      </div>
                    )}
                  </div>

                  {videoUrl && !isPending && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={downloadHref(videoUrl, title || 'reelwright-ad')} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download ad
                      </a>
                    </Button>
                  )}

                  {stillSourceField}

                  {formatPicker}

                  {lengthPicker}

                  <div className="space-y-2">
                    <Label htmlFor="animate-title">Ad name</Label>
                    <Input
                      id="animate-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Product spin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="animate-prompt">Motion</Label>
                    <Textarea
                      id="animate-prompt"
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Slow orbit around the bottle as light glides across the label…"
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
                    Generate {targetLength}s video · {formatCredits(videoLengthCost(targetLength))}
                  </Button>
                  {creditsPackCard}
                </CardContent>
              </Card>
              <AdTemplates panel="animate" disabled={isPending} onPickTemplate={applyTemplate} />
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
                    Your ads
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Video ads
                  </h2>
                </div>
                {!user ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-card/20 px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign in to see the ads you&apos;ve made.
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
                  <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Images</p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Image ads
                  </h2>
                </div>
                {!user ? (
                  <p className="text-sm text-muted-foreground">Sign in to keep your images.</p>
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
