
"use client";

import React, { useState, useEffect, useActionState, startTransition, useRef } from 'react';
import NextImage from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
// Removed AppShell import
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from '@/contexts/AuthContext'; // Added
import { useBrand } from '@/contexts/BrandContext';
import { useToast } from '@/hooks/use-toast';
import { ImageIcon, MessageSquareText, Newspaper, Palette, Type, ThumbsUp, Copy, Ratio, ImageUp, UserSquare, Wand2, Loader2, Trash2, Images, Globe, ExternalLink, CircleSlash, Pipette, FileText, ListOrdered, Mic2, Edit, Briefcase, Eye, Save, Tag, Paintbrush, Zap, Aperture, PaletteIcon, Server, RefreshCw, Download } from 'lucide-react';
import { handleGenerateImagesAction, handleGenerateSocialMediaCaptionAction, handleGenerateBlogContentAction, handleDescribeImageAction, handleGenerateBlogOutlineAction, handleSaveGeneratedImagesAction, handleCheckFreepikTaskStatusAction, type FormState } from '@/lib/actions';
import { SubmitButton } from "@/components/SubmitButton";
import type { GeneratedImage, GeneratedSocialMediaPost, GeneratedBlogPost, SavedGeneratedImage } from '@/types';
import type { DescribeImageOutput } from "@/ai/flows/describe-image-flow";
import type { GenerateBlogOutlineOutput } from "@/ai/flows/generate-blog-outline-flow";
import type { GenerateImagesInput } from '@/ai/flows/generate-images';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Keeping this import as is, though not directly part of the instruction, it's correct
import { industries, imageStylePresets, freepikImagen3EffectColors, freepikImagen3EffectLightnings, freepikImagen3EffectFramings, freepikImagen3AspectRatios, generalAspectRatios, blogTones, freepikValidStyles } from '@/lib/constants';


const initialImageFormState: FormState<{ generatedImages: string[]; promptUsed: string; providerUsed: string; }>= { error: undefined, data: undefined, message: undefined };
const initialSocialFormState: FormState<{ caption: string; hashtags: string; imageSrc: string | null }> = { error: undefined, data: undefined, message: undefined };
const initialBlogFormState: FormState<{ title: string; content: string; tags: string }> = { error: undefined, data: undefined, message: undefined };
const initialDescribeImageState: FormState<DescribeImageOutput> = { error: undefined, data: undefined, message: undefined };
const initialBlogOutlineState: FormState<GenerateBlogOutlineOutput> = { error: undefined, data: undefined, message: undefined };
const initialSaveImagesState: FormState<{savedCount: number}> = { error: undefined, data: undefined, message: undefined };
const initialFreepikTaskStatusState: FormState<{ status: string; images: string[] | null; taskId: string;}> = { error: undefined, data: undefined, message: undefined };

const imageGenerationProviders = [
    { value: "GEMINI", label: "Gemini (Google AI)", disabled: false },
    { value: "FREEPIK", label: "Freepik API (imagen3)" },
    { value: "LEONARDO_AI", label: "Leonardo.ai (Not Implemented)", disabled: true },
    { value: "IMAGEN", label: "Imagen (via Vertex - Not Implemented)", disabled: true },
];

type SocialImageChoice = 'generated' | 'profile' | null;

export default function ContentStudioPage() {
  const { currentUser } = useAuth(); // Added
  const { brandData, addGeneratedImage, addGeneratedSocialPost, addGeneratedBlogPost, userId } = useBrand();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [imageState, imageAction] = useActionState(handleGenerateImagesAction, initialImageFormState);
  const [socialState, socialAction] = useActionState(handleGenerateSocialMediaCaptionAction, initialSocialFormState);
  const [blogState, blogAction] = useActionState(handleGenerateBlogContentAction, initialBlogFormState);
  const [describeImageState, describeImageAction] = useActionState(handleDescribeImageAction, initialDescribeImageState);
  const [blogOutlineState, blogOutlineAction] = useActionState(handleGenerateBlogOutlineAction, initialBlogOutlineState);
  
  const [saveImagesServerActionState, saveImagesAction] = useActionState(handleSaveGeneratedImagesAction, initialSaveImagesState);
  const [isSavingImages, setIsSavingImages] = useState(false);

  const [freepikTaskStatusState, freepikTaskStatusAction] = useActionState(handleCheckFreepikTaskStatusAction, initialFreepikTaskStatusState);

  const [lastSuccessfulGeneratedImageUrls, setLastSuccessfulGeneratedImageUrls] = useState<string[]>([]);
  const [lastUsedImageGenPrompt, setLastUsedImageGenPrompt] = useState<string | null>(null);
  const [lastUsedImageProvider, setLastUsedImageProvider] = useState<string | null>(null);

  const [generatedSocialPost, setGeneratedSocialPost] = useState<{caption: string, hashtags: string, imageSrc: string | null} | null>(null);
  const [generatedBlogPost, setGeneratedBlogPost] = useState<{title: string, content: string, tags: string} | null>(null);
  const [generatedBlogOutline, setGeneratedBlogOutline] = useState<string>("");

  const [useImageForSocialPost, setUseImageForSocialPost] = useState<boolean>(false);
  const [socialImageChoice, setSocialImageChoice] = useState<SocialImageChoice>(null);
  const [socialToneValue, setSocialToneValue] = useState<string>("professional");
  const [customSocialToneNuances, setCustomSocialToneNuances] = useState<string>("");

  const [blogPlatformValue, setBlogPlatformValue] = useState<"Medium" | "Other">("Medium");
  const [selectedBlogTone, setSelectedBlogTone] = useState<string>(blogTones[0].value);

  const [numberOfImagesToGenerate, setNumberOfImagesToGenerate] = useState<string>("1");
  const [activeTab, setActiveTab] = useState<string>("image");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState<boolean>(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState<boolean>(false);

  const [selectedProfileImageIndexForGen, setSelectedProfileImageIndexForGen] = useState<number | null>(null);
  const [selectedProfileImageIndexForSocial, setSelectedProfileImageIndexForSocial] = useState<number | null>(null);

  const [selectedImageProvider, setSelectedImageProvider] = useState<GenerateImagesInput['provider']>(imageGenerationProviders[0].value as GenerateImagesInput['provider']);
  const [imageGenBrandDescription, setImageGenBrandDescription] = useState<string>("");
  const [imageGenIndustry, setImageGenIndustry] = useState<string>("");
  const [selectedImageStylePreset, setSelectedImageStylePreset] = useState<string>(imageStylePresets[0].value);
  const [customStyleNotesInput, setCustomStyleNotesInput] = useState<string>("");
  const [imageGenNegativePrompt, setImageGenNegativePrompt] = useState<string>("");
  const [imageGenSeed, setImageGenSeed] = useState<string>("");

  const [currentAspectRatioOptions, setCurrentAspectRatioOptions] = useState(generalAspectRatios);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>(generalAspectRatios[0].value);

  const [freepikDominantColorsInput, setFreepikDominantColorsInput] = useState<string>("");
  const [freepikEffectColor, setFreepikEffectColor] = useState<string>("none");
  const [freepikEffectLightning, setFreepikEffectLightning] = useState<string>("none");
  const [freepikEffectFraming, setFreepikEffectFraming] = useState<string>("none");

  const [isPreviewingPrompt, setIsPreviewingPrompt] = useState<boolean>(false);
  const [currentTextPromptForEditing, setCurrentTextPromptForEditing] = useState<string>("");
  const [formSnapshot, setFormSnapshot] = useState<Partial<GenerateImagesInput> & { provider?: string } | null>(null);

  const [checkingTaskId, setCheckingTaskId] = useState<string | null>(null);
  const [selectedBlogIndustry, setSelectedBlogIndustry] = useState<string>("_none_"); // Added for blog industry
  const isClearingRef = useRef(false);

  // New state variables for admin mode and example image usage
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [useExampleImageForGen, setUseExampleImageForGen] = useState<boolean>(true); // Default to true


  useEffect(() => {
    console.log("🔍 ContentStudio: brandData received:", brandData);
    if (brandData) {
        console.log("🔍 ContentStudio: Industry from brandData:", brandData.industry);
        setImageGenBrandDescription(brandData.brandDescription || "");
        // Fix: Use the actual industry value from brandData, fallback to "_none_" only if truly empty
        const industryValue = brandData.industry && brandData.industry.trim() !== "" ? brandData.industry : "_none_";
        console.log("🔍 ContentStudio: Resolved industry value:", industryValue);
        setImageGenIndustry(industryValue);
        setSelectedBlogIndustry(industryValue); // Use the same value for blog industry
        setCustomStyleNotesInput(brandData.imageStyleNotes || "");

        if (brandData.exampleImages && brandData.exampleImages.length > 0) {
            if (selectedProfileImageIndexForGen === null) setSelectedProfileImageIndexForGen(0);
            if (selectedProfileImageIndexForSocial === null) setSelectedProfileImageIndexForSocial(0);
        } else {
            setSelectedProfileImageIndexForGen(null);
            setSelectedProfileImageIndexForSocial(null);
        }
    } else {
        console.log("🔍 ContentStudio: No brandData, using defaults");
        setImageGenBrandDescription("");
        setImageGenIndustry("_none_");
        setCustomStyleNotesInput("");
        setSelectedProfileImageIndexForGen(null);
        setSelectedProfileImageIndexForSocial(null);
        setSelectedBlogIndustry("_none_");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandData]);

  useEffect(() => {
    if (currentUser && currentUser.email === 'admin@brandforge.ai') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
      // For non-admins, always default to GEMINI provider
      setSelectedImageProvider("GEMINI");
    }
  }, [currentUser]);

    useEffect(() => {
    if (selectedImageProvider === 'FREEPIK') {
      setCurrentAspectRatioOptions(freepikImagen3AspectRatios);
      if (!freepikImagen3AspectRatios.find(ar => ar.value === selectedAspectRatio)) {
        setSelectedAspectRatio(freepikImagen3AspectRatios[0].value);
      }
    } else {
      setCurrentAspectRatioOptions(generalAspectRatios);
      if (!generalAspectRatios.find(ar => ar.value === selectedAspectRatio)) {
        setSelectedAspectRatio(generalAspectRatios[0].value);
      }
    }
    }, [selectedImageProvider, selectedAspectRatio]);

  useEffect(() => {
    if (imageState.data && imageState.data.generatedImages && imageState.data.generatedImages.length > 0) {
      const newImageUrls = imageState.data.generatedImages;
      setLastSuccessfulGeneratedImageUrls(newImageUrls);
      setLastUsedImageGenPrompt(imageState.data.promptUsed);
      setLastUsedImageProvider(imageState.data.providerUsed);

      const displayableImages = newImageUrls.filter(url => url && (url.startsWith('data:') || url.startsWith('image_url:')));
      if (displayableImages.length > 0) {
        displayableImages.forEach(url => {
            const displayUrl = url.startsWith('image_url:') ? url.substring(10) : url;
            const newImage: GeneratedImage = {
                id: `${new Date().toISOString()}-${Math.random().toString(36).substring(2, 9)}`,
                src: displayUrl,
                prompt: imageState.data?.promptUsed || "",
                style: selectedImageStylePreset + (customStyleNotesInput ? ". " + customStyleNotesInput : "")
            };
            addGeneratedImage(newImage);
        });
          toast({ title: "Success", description: `${displayableImages.length} image(s) processed using ${imageState.data.providerUsed || 'default provider'}.` });
      } else if (newImageUrls.some(url => url.startsWith('task_id:'))) {
        toast({ title: "Freepik Task Started", description: "Freepik image generation task started. Use 'Check Status' to retrieve images." });
      } else if (!newImageUrls || newImageUrls.length === 0) {
        toast({ title: "No Images/Tasks Generated", description: `Received empty list from ${imageState.data?.providerUsed || 'default provider'}.`, variant: "default" });
      }
      setIsPreviewingPrompt(false);
      setFormSnapshot(null);
    }
 if (imageState.error) {
      toast({ title: "Error generating images", description: imageState.error, variant: "destructive" });
 setIsPreviewingPrompt(false);
 setFormSnapshot(null);
    }
  }, [imageState, toast, addGeneratedImage, customStyleNotesInput, selectedImageStylePreset]);

  useEffect(() => {
    if (socialState.data) {
      const socialData = socialState.data;
      setGeneratedSocialPost({ caption: socialData.caption, hashtags: socialData.hashtags, imageSrc: socialData.imageSrc });
        const newPost: GeneratedSocialMediaPost = {
        id: new Date().toISOString(),
        platform: 'Instagram', 
        imageSrc: socialData.imageSrc || null,
        imageDescription: (document.getElementById('socialImageDescription') as HTMLTextAreaElement)?.value || "",
        caption: socialData.caption,
        hashtags: socialData.hashtags,
        tone: socialToneValue + (customSocialToneNuances ? ` ${customSocialToneNuances}` : ''),
      };
      addGeneratedSocialPost(newPost);
      toast({ title: "Success", description: socialState.message });
    }
    if (socialState.error) toast({ title: "Error generating social post", description: socialState.error, variant: "destructive" });
  }, [socialState, toast, addGeneratedSocialPost, socialToneValue, customSocialToneNuances]);

  useEffect(() => {
    if (blogState.data) {
      const blogData = blogState.data;
      setGeneratedBlogPost(blogData);
      const newPost: GeneratedBlogPost = {
        id: new Date().toISOString(),
        title: blogData.title,
        content: blogData.content,
        tags: blogData.tags,
        platform: blogPlatformValue,
      };
      addGeneratedBlogPost(newPost);
      toast({ title: "Success", description: blogState.message });
    }
    if (blogState.error) toast({ title: "Error generating blog post", description: blogState.error, variant: "destructive" });
  }, [blogState, toast, addGeneratedBlogPost, blogPlatformValue]);

  useEffect(() => {
    setIsGeneratingDescription(false);
    if (describeImageState.data) {
      const socialImageDescriptionTextarea = document.getElementById('socialImageDescription') as HTMLTextAreaElement | null;
      if (socialImageDescriptionTextarea) {
        socialImageDescriptionTextarea.value = describeImageState.data.description;
      }
      toast({ title: "Success", description: describeImageState.message || "Image description generated." });
    }
    if (describeImageState.error) {
      toast({ title: "Error generating image description", description: describeImageState.error, variant: "destructive" });
    }
  }, [describeImageState, toast]);

  useEffect(() => {
    setIsGeneratingOutline(false);
    if (blogOutlineState.data) {
        setGeneratedBlogOutline(blogOutlineState.data.outline);
        toast({ title: "Success", description: blogOutlineState.message || "Blog outline generated." });
    }
    if (blogOutlineState.error) {
        toast({ title: "Outline Error", description: blogOutlineState.error, variant: "destructive" });
    }
  }, [blogOutlineState, toast]);

  useEffect(() => {
    setIsSavingImages(false); 
    if (saveImagesServerActionState.message && !saveImagesServerActionState.error) {
      toast({ title: "Image Library", description: saveImagesServerActionState.message });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['savedLibraryImages', userId] });
      }
    }
    if (saveImagesServerActionState.error) {
      toast({ title: "Error Saving Images", description: saveImagesServerActionState.error, variant: "destructive"});
    }
  }, [saveImagesServerActionState, toast, queryClient, userId]);


  useEffect(() => {
    if (freepikTaskStatusState.data) {
      const { status, images, taskId } = freepikTaskStatusState.data;
      if (status === 'COMPLETED' && images && images.length > 0) {
        const newImageUrls = images.map(url => `image_url:${url}`); 
        setLastSuccessfulGeneratedImageUrls(prevUrls => {
            const taskIdentifier = `task_id:${taskId}`;
            const existingTaskIndex = prevUrls.findIndex(url => url === taskIdentifier);
            if (existingTaskIndex !== -1) {
                const before = prevUrls.slice(0, existingTaskIndex);
                const after = prevUrls.slice(existingTaskIndex + 1);
                return [...before, ...newImageUrls, ...after];
            } else {
                  const otherImages = prevUrls.filter(url => !url.startsWith('task_id:'));
                  return [...otherImages, ...newImageUrls];
            }
        });
        toast({ title: `Task ${taskId.substring(0,8)}... Completed`, description: `${images.length} image(s) retrieved.` });
      } else if (status === 'IN_PROGRESS') {
        toast({ title: `Task ${taskId.substring(0,8)}... Still In Progress`, description: "Please check again in a few moments." });
      } else if (status === 'FAILED') {
        toast({ title: `Task ${taskId.substring(0,8)}... Failed`, description: "Freepik failed to generate images for this task.", variant: "destructive" });
          setLastSuccessfulGeneratedImageUrls(prevUrls => prevUrls.filter(url => url !== `task_id:${taskId}`));
      } else { 
          toast({ title: `Task ${taskId.substring(0,8)}... Status: ${status}`, description: "Could not retrieve images or task has an unexpected status." });
      }
      setCheckingTaskId(null);
    }
    if (freepikTaskStatusState.error) {
      toast({ title: "Error Checking Task Status", description: freepikTaskStatusState.error, variant: "destructive" });
      setCheckingTaskId(null);
    }
  }, [freepikTaskStatusState, toast]);


  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${type} Copied!`, description: "Content copied to clipboard." });
  };

 const handleClearGeneratedImages = () => {
    setLastSuccessfulGeneratedImageUrls([]);
    setLastUsedImageGenPrompt(null);
    setLastUsedImageProvider(null);
    setFormSnapshot(null);
    setIsPreviewingPrompt(false);
    // Don't call imageAction when clearing - just reset the local state
  };

  const handleSaveAllGeneratedImages = () => {
    setIsSavingImages(true);
    const saveableImages = lastSuccessfulGeneratedImageUrls
        .filter(url => url && (url.startsWith('data:') || url.startsWith('image_url:')))
        .map(url => ({
            dataUri: url,
            prompt: lastUsedImageGenPrompt || "N/A",
            style: (selectedImageStylePreset + (customStyleNotesInput ? ". " + customStyleNotesInput : "")),
        }));

    if (saveableImages.length === 0) {
        toast({ title: "No new images to save", description: "No valid generated images are available for saving.", variant: "default"});
        setIsSavingImages(false);
        return;
    }

    console.log('Saving images:', saveableImages);

    // Check for userId BEFORE the startTransition block
    if (!userId) {
        toast({title: "Authentication Error", description: "User not logged in. Cannot save images.", variant: "destructive"});
        setIsSavingImages(false);
        return; // Return early if userId is missing
    }

    startTransition(() => {
 const formData = new FormData();
 formData.append('imagesToSaveJson', JSON.stringify(saveableImages));
 formData.append('userId', userId); // userId is guaranteed to be string here
 saveImagesAction(formData);
    });
  };

  const handleUseGeneratedImageForSocial = () => {
    const firstDisplayableImage = lastSuccessfulGeneratedImageUrls.find(url => url?.startsWith('data:') || url?.startsWith('image_url:'));
    if (firstDisplayableImage) {
      setUseImageForSocialPost(true);
      setSocialImageChoice('generated');
      setSelectedProfileImageIndexForSocial(null);
      setActiveTab('social');
      toast({title: "Image Selected", description: "First available generated image selected for social post."});
    } else {
      toast({title: "No Image", description: "Please generate a displayable image first (e.g. Gemini, or completed Freepik task).", variant: "destructive"});
    }
  };

  const currentExampleImageForGen = (useExampleImageForGen && brandData?.exampleImages && selectedProfileImageIndexForGen !== null && brandData.exampleImages[selectedProfileImageIndexForGen]) || "";

  const currentSocialImagePreviewUrl = useImageForSocialPost
    ? (socialImageChoice === 'generated'
        ? (lastSuccessfulGeneratedImageUrls.find(url => url?.startsWith('data:') || url?.startsWith('image_url:'))?.replace(/^image_url:/, '') || null)
        : (socialImageChoice === 'profile'
            ? (brandData?.exampleImages && selectedProfileImageIndexForSocial !== null && brandData.exampleImages[selectedProfileImageIndexForSocial]) || null
            : null))
    : null;

  const handleAIDescribeImage = () => {
    if (!currentSocialImagePreviewUrl) {
      toast({ title: "No Image Selected", description: "Please select an image to describe.", variant: "destructive" });
      return;
    }
    setIsGeneratingDescription(true);
    const formData = new FormData();
    formData.append("imageDataUri", currentSocialImagePreviewUrl); 
    startTransition(() => {
        describeImageAction(formData);
    });
  };

  const socialSubmitDisabled = socialState.data?.caption ? false : (useImageForSocialPost && !currentSocialImagePreviewUrl);

  const handlePreviewPromptClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const currentIndustryValue = imageGenIndustry || brandData?.industry || "_none_";
    const industryLabelForPreview = industries.find(i => i.value === currentIndustryValue)?.label || currentIndustryValue;
    console.log("DEBUG PREVIEW: currentIndustryValue:", currentIndustryValue, "resolved to industryLabelForPreview:", industryLabelForPreview);

    const industryCtx = (industryLabelForPreview && industryLabelForPreview !== "None / Not Applicable" && industryLabelForPreview !== "_none_") ? ` The brand operates in the ${industryLabelForPreview} industry.` : "";
    // Use currentExampleImageForGen which respects useExampleImageForGen state
    const exampleImg = useExampleImageForGen ? currentExampleImageForGen : ""; 
    const combinedStyle = selectedImageStylePreset + (customStyleNotesInput ? `. ${customStyleNotesInput}` : "");
    const negPrompt = imageGenNegativePrompt;
    const aspect = selectedAspectRatio;
    const numImages = parseInt(numberOfImagesToGenerate, 10);
    const seedValueStr = imageGenSeed;
    const seedValue = seedValueStr && !isNaN(parseInt(seedValueStr)) ? parseInt(seedValueStr, 10) : undefined;
    const compositionGuidance = "IMPORTANT COMPOSITION RULE: When depicting human figures as the primary subject, the image *must* be well-composed. Avoid awkward or unintentional cropping of faces or key body parts. Ensure the figure is presented naturally and fully within the frame, unless the prompt *explicitly* requests a specific framing like 'close-up', 'headshot', 'upper body shot', or an artistic crop. Prioritize showing the entire subject if it's a person.";

    let textPromptContent = "";

    if (selectedImageProvider === 'FREEPIK') {
        if (exampleImg) {
            textPromptContent = `[An AI-generated description of your example image will be used here by the backend to guide content when Freepik/Imagen3 is selected.]\nUsing that description as primary inspiration for the subject and main visual elements, now generate an image based on the following concept: "${imageGenBrandDescription}".`;
        } else {
            textPromptContent = `Generate an image based on the concept: "${imageGenBrandDescription}".`;
        }
        textPromptContent += `${industryCtx}`;
        
        console.log("DEBUG PREVIEW (Freepik): selectedImageStylePreset:", `"${selectedImageStylePreset}"`);
        console.log("DEBUG PREVIEW (Freepik): imported freepikValidStyles:", freepikValidStyles);

        const firstPresetKeyword = selectedImageStylePreset.toLowerCase().trim().split(/[,.]|\s-\s/)[0].trim(); 
        const isPresetAStructuralFreepikStyle = freepikValidStyles.some(s => s.toLowerCase() === firstPresetKeyword);
        
        console.log("DEBUG PREVIEW (Freepik): firstPresetKeyword:", `"${firstPresetKeyword}"`);
        console.log("DEBUG PREVIEW (Freepik): isPresetAStructuralFreepikStyle:", isPresetAStructuralFreepikStyle);

        if (isPresetAStructuralFreepikStyle) {
            const presetLabel = imageStylePresets.find(p => p.value === selectedImageStylePreset)?.label || selectedImageStylePreset;
            textPromptContent += `\n(The base style '${presetLabel}' will be applied structurally by Freepik.)`;
            if (customStyleNotesInput) {
                textPromptContent += `\nIncorporate these additional custom stylistic details: "${customStyleNotesInput}".`;
            }
        } else {
            if (combinedStyle) { 
                textPromptContent += `\nIncorporate these stylistic details and elements: "${combinedStyle}".`;
            }
        }
        
        // For Freepik, negative prompt is structural, so not added textually in PREVIEW
        // textPromptContent += `\n\nAvoid: ${negPrompt}.`; 
        textPromptContent += `\n\n${compositionGuidance}`;

    } else { 
        // For Gemini and other general providers
        if (exampleImg) {
            textPromptContent = `You are creating a strategic brand marketing image designed to drive engagement, build brand awareness, and convert viewers into customers on social media platforms.

**BRAND STRATEGY CONTEXT:**
The provided example image serves as a category reference only. Your mission is to create a completely new, brand-aligned visual asset that:
- Captures attention in crowded social media feeds
- Communicates brand values instantly
- Appeals to the target demographic
- Encourages social sharing and engagement
- Supports the brand's marketing objectives

**CORE CREATIVE BRIEF:**
1. **Brand Identity**: "${imageGenBrandDescription}"${industryCtx}
   - Extract the brand's personality, values, and unique selling proposition
   - Consider the target audience's lifestyle, aspirations, and pain points
   - Identify what makes this brand different from competitors
   - Think about the emotional connection the brand wants to create

2. **Visual Execution Style**: "${combinedStyle}"
   - This defines the aesthetic approach, mood, and technical execution
   - For realistic styles: Create professional, market-ready visuals
   - For artistic styles: Balance creativity with brand recognition
   - Consider platform-specific best practices (Instagram, TikTok, etc.)

**MARKETING OPTIMIZATION REQUIREMENTS:**
- **Scroll-stopping power**: The image must stand out in social feeds
- **Brand consistency**: Align with the brand's visual identity and messaging
- **Target audience appeal**: Resonate with the specific demographic
- **Conversion potential**: Include subtle elements that encourage action
- **Shareability factor**: Create content people want to share
- **Platform optimization**: Consider where this will be posted

**CREATIVE GUIDELINES:**
- Use the example image ONLY for category identification
- Create something completely new that embodies the brand essence
- Avoid generic or cliché visual approaches
- Include contextual elements that tell a brand story
- Consider seasonal trends and cultural relevance
- Ensure the image works both as standalone content and in campaigns

**QUALITY STANDARDS:**
- Professional marketing-grade quality
- Optimized for social media engagement
- Culturally sensitive and inclusive
- Technically excellent (lighting, composition, clarity)
- Brand-appropriate and on-message`;
        } else {
            textPromptContent = `You are creating a strategic brand marketing image designed to maximize social media engagement and brand recognition.

**BRAND MARKETING OBJECTIVE:**
Create a compelling visual that represents: "${imageGenBrandDescription}"${industryCtx}

**STRATEGIC REQUIREMENTS:**
- **Brand Storytelling**: The image should instantly communicate the brand's core value proposition
- **Target Audience Appeal**: Consider who this brand serves and what resonates with them
- **Social Media Optimization**: Design for maximum engagement on platforms like Instagram, TikTok, Facebook
- **Conversion Focus**: Include elements that encourage viewers to learn more or take action
- **Brand Differentiation**: Highlight what makes this brand unique in its market

**VISUAL EXECUTION STYLE**: "${combinedStyle}"
- For realistic styles: Create professional, market-ready content
- For artistic styles: Balance creativity with brand clarity
- Ensure the style enhances rather than overshadows the brand message

**MARKETING BEST PRACTICES:**
- Use colors and composition that align with brand personality
- Include contextual elements that tell a brand story
- Consider current social media trends and visual preferences
- Ensure the image works both standalone and in marketing campaigns
- Create content that encourages social sharing and engagement

**QUALITY STANDARDS:**
- Professional marketing-grade execution
- Culturally appropriate and inclusive
- Technically excellent (lighting, composition, clarity)
- Brand-consistent and strategically aligned`;
        }

        if (negPrompt) {
            textPromptContent += `\n\nAvoid the following elements or characteristics in the image: ${negPrompt}.`;
        }
        if (aspect) {
            textPromptContent += `\n\nThe final image should have an aspect ratio of ${aspect}. Ensure the composition fits this ratio naturally, and the image content itself must fully occupy this ${aspect} frame, without any artificial letterboxing or pillarboxing.`;
        }
        if (seedValue !== undefined) {
            textPromptContent += `\n\nUse seed: ${seedValue}.`;
        }
        textPromptContent +=`\n\n${compositionGuidance}`;
        if (numImages > 1 ) {
            textPromptContent += `\n\nImportant for batch generation: You are generating image 1 of a set of ${numImages}. All images in this set should feature the *same core subject or item* as described/derived from the inputs. For this specific image (1/${numImages}), try to vary the pose, angle, or minor background details slightly compared to other images in the set, while maintaining the identity of the primary subject.`;
        }
    }
    
    setCurrentTextPromptForEditing(textPromptContent);
    setFormSnapshot({
        provider: selectedImageProvider,
        brandDescription: imageGenBrandDescription,
        industry: currentIndustryValue === "_none_" ? "" : currentIndustryValue,
        imageStyle: combinedStyle, 
        exampleImage: (useExampleImageForGen && exampleImg && exampleImg.trim() !== "") ? exampleImg : undefined,
        aspectRatio: aspect,
        numberOfImages: numImages,
        negativePrompt: negPrompt === "" ? undefined : negPrompt, // Keep as string
        seed: seedValue,
        freepikStylingColors: selectedImageProvider === 'FREEPIK' && freepikDominantColorsInput ? freepikDominantColorsInput.split(',').map(c => ({color: c.trim(), weight: 0.5})) : undefined,
        freepikEffectColor: selectedImageProvider === 'FREEPIK' && freepikEffectColor !== "none" ? freepikEffectColor : undefined,
        freepikEffectLightning: selectedImageProvider === 'FREEPIK' && freepikEffectLightning !== "none" ? freepikEffectLightning : undefined,
        freepikEffectFraming: selectedImageProvider === 'FREEPIK' && freepikEffectFraming !== "none" ? freepikEffectFraming : undefined,
    });
    setIsPreviewingPrompt(true);
  };

  const handleImageGenerationSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validate required fields
    const brandDesc = formSnapshot?.brandDescription || imageGenBrandDescription || brandData?.brandDescription || ""; // formSnapshot used by admin flow
    const imageStyle = formSnapshot?.imageStyle || (selectedImageStylePreset + (customStyleNotesInput ? ". " + customStyleNotesInput : "")); // formSnapshot used by admin flow
    
    if (!brandDesc.trim()) {
      toast({ title: "Missing Brand Description", description: "Please provide a brand description to generate images.", variant: "destructive" });
      return;
    }
    
    if (!imageStyle.trim()) {
      toast({ title: "Missing Image Style", description: "Please select an image style preset.", variant: "destructive" });
      return;
    }
    
    startTransition(() => {
        const formData = new FormData();

        formData.append("finalizedTextPrompt", currentTextPromptForEditing || ""); // currentTextPromptForEditing is set by handlePreviewPromptClick (admin) or handleDirectImageGeneration (normal user)

        // Provider: Admin uses selectedImageProvider (via formSnapshot), Non-admin defaults to GEMINI
        const providerToUse = isAdmin ? (formSnapshot?.provider || selectedImageProvider) : "GEMINI";
        formData.append("provider", providerToUse as string);

        formData.append("brandDescription", String(brandDesc || "")); // Revert to previous state
        
        const industryToSubmit = formSnapshot?.industry || imageGenIndustry || brandData?.industry || ""; // formSnapshot for admin
        formData.append("industry", industryToSubmit === "_none_" ? "" : (industryToSubmit || ""));
        
        formData.append("imageStyle", imageStyle);
        
        // Example Image: formSnapshot for admin, direct state for non-admin (though prompt construction handles this)
        const exampleImgToUse = isAdmin ? formSnapshot?.exampleImage : (useExampleImageForGen && currentExampleImageForGen ? currentExampleImageForGen : undefined);
        if (typeof exampleImgToUse === 'string' && exampleImgToUse.trim() !== "") {
          formData.append("exampleImage", exampleImgToUse);
        }

        formData.append("aspectRatio", formSnapshot?.aspectRatio || selectedAspectRatio); // formSnapshot for admin
        formData.append("numberOfImages", String(formSnapshot?.numberOfImages || parseInt(numberOfImagesToGenerate,10))); // formSnapshot for admin

        const negPromptValue = isAdmin ? formSnapshot?.negativePrompt : imageGenNegativePrompt; // formSnapshot for admin
        if (negPromptValue && negPromptValue.toString().trim() !== "") { // Check for undefined and empty string
            formData.append("negativePrompt", negPromptValue.toString()); // Ensure it's a string
        }

        const seedValueNum = isAdmin ? formSnapshot?.seed : (imageGenSeed && !isNaN(parseInt(imageGenSeed)) ? parseInt(imageGenSeed) : undefined); // formSnapshot for admin
        if (seedValueNum !== undefined) {
          formData.append("seed", String(seedValueNum));
        }

        if (providerToUse === 'FREEPIK') {
            const fColorsFromSnapshot = formSnapshot?.freepikStylingColors; // Admin uses formSnapshot
            const fColorsInputStrToUse = isAdmin && fColorsFromSnapshot 
                ? fColorsFromSnapshot.map(c => c.color).join(',') 
                : freepikDominantColorsInput;
            if (fColorsInputStrToUse) formData.append("freepikDominantColorsInput", fColorsInputStrToUse);

            const fEffectColorToUse = isAdmin ? (formSnapshot?.freepikEffectColor || freepikEffectColor) : freepikEffectColor;
            if (fEffectColorToUse && fEffectColorToUse !== "none") formData.append("freepikEffectColor", fEffectColorToUse);

            const fEffectLightningToUse = isAdmin ? (formSnapshot?.freepikEffectLightning || freepikEffectLightning) : freepikEffectLightning;
            if (fEffectLightningToUse && fEffectLightningToUse !== "none") formData.append("freepikEffectLightning", fEffectLightningToUse);

            const fEffectFramingToUse = isAdmin ? (formSnapshot?.freepikEffectFraming || freepikEffectFraming) : freepikEffectFraming;
            if (fEffectFramingToUse && fEffectFramingToUse !== "none") formData.append("freepikEffectFraming", fEffectFramingToUse);
        }
        
        console.log("FormData being sent:", {
          provider: providerToUse,
          brandDescription: brandDesc,
          imageStyle,
          aspectRatio: formSnapshot?.aspectRatio || selectedAspectRatio,
          numberOfImages: formSnapshot?.numberOfImages || parseInt(numberOfImagesToGenerate,10)
        });
        
        imageAction(formData);
    });
  };

  const handleGenerateBlogOutline = () => {
    setIsGeneratingOutline(true);
    const formData = new FormData();
    formData.append('brandName', (document.getElementById('blogBrandName') as HTMLInputElement)?.value || brandData?.brandName || "");
    formData.append('blogBrandDescription', (document.getElementById('blogBrandDescription') as HTMLTextAreaElement)?.value || brandData?.brandDescription || "");
    formData.append('industry', selectedBlogIndustry === "_none_" ? "" : selectedBlogIndustry); // Use selectedBlogIndustry state
    formData.append('blogKeywords', (document.getElementById('blogKeywords') as HTMLInputElement)?.value || brandData?.targetKeywords || "");
    formData.append('blogWebsiteUrl', (document.getElementById('blogWebsiteUrl') as HTMLInputElement)?.value || brandData?.websiteUrl || "");

    if (!formData.get('brandName') && !formData.get('blogBrandDescription') && !formData.get('blogKeywords')) {
        toast({title: "Missing Info", description: "Please provide Brand Name, Description, and Keywords for outline generation.", variant: "destructive"});
        setIsGeneratingOutline(false);
        return;
    }
    startTransition(() => {
        blogOutlineAction(formData);
    });
  };

  const handleSocialSubmit = async (formData: FormData) => {
      let imageSrc = formData.get("selectedImageSrcForSocialPost") as string | null;
      const MAX_IMAGE_SIZE_BYTES = 1000 * 1024; // 1MB (Firestore limit is 1,048,487 bytes)

      if (imageSrc && imageSrc.startsWith('data:')) {
          const originalImageSizeInBytes = imageSrc.length * 0.75;

          if (originalImageSizeInBytes > MAX_IMAGE_SIZE_BYTES) {
              toast({
                  title: "Compressing Image...",
                  description: `Image size (${(originalImageSizeInBytes / (1024*1024)).toFixed(2)} MB) exceeds 1MB. Attempting client-side compression.`,
                  duration: 3000,
              });

              try {
                  const compressedImageUri = await new Promise<string>((resolve, reject) => {
                      const img = new Image();
                      img.onload = () => {
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');

                          // Calculate new dimensions to fit within a reasonable size while maintaining aspect ratio
                          const maxWidth = 1920; // Max width for social media images
                          const maxHeight = 1080; // Max height for social media images
                          let width = img.width;
                          let height = img.height;

                          if (width > height) {
                              if (width > maxWidth) {
                                  height *= maxWidth / width;
                                  width = maxWidth;
                              }
                          } else {
                              if (height > maxHeight) {
                                  width *= maxHeight / height;
                                  height = maxHeight;
                              }
                          }

                          canvas.width = width;
                          canvas.height = height;

                          ctx?.drawImage(img, 0, 0, width, height);

                          // Try to compress to JPEG with quality 0.7
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                          resolve(dataUrl);
                      };
                      img.onerror = reject;
                      img.src = imageSrc;
                  });

                  const compressedSizeInBytes = compressedImageUri.length * 0.75;
                  if (compressedSizeInBytes > MAX_IMAGE_SIZE_BYTES) {
                      toast({
                          title: "Compression Failed",
                          description: `Even after compression, the image (${(compressedSizeInBytes / (1024*1024)).toFixed(2)} MB) is still too large. Please use a smaller image or generate the text and upload the image manually.`,
                          variant: "destructive",
                          duration: 8000,
                      });
                      return; // Stop submission
                  } else {
                      toast({
                          title: "Image Compressed",
                          description: `Image successfully compressed to ${(compressedSizeInBytes / 1024).toFixed(2)} KB.`,
                          duration: 3000,
                      });
                      formData.set("selectedImageSrcForSocialPost", compressedImageUri); // Update formData with compressed image
                  }
              } catch (error) {
                  console.error("Image compression error:", error);
                  toast({
                      title: "Image Compression Error",
                      description: "Could not compress image. Please try a different image or generate text only.",
                      variant: "destructive",
                      duration: 8000,
                  });
                  return; // Stop submission
              }
          }
      }
      startTransition(() => {
          socialAction(formData);
      });
  };

  const handleFetchFreepikResult = (taskId: string) => {
    setCheckingTaskId(taskId);
    const formData = new FormData();
    formData.append("taskId", taskId);
    startTransition(() => {
      freepikTaskStatusAction(formData);
    });
  };

  const downloadImage = (imageUrl: string, filename = "generated-image.png") => {
    if (imageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else { 
      window.open(imageUrl, '_blank');
    }
  };

  return (
    // AppShell is now handled by AuthenticatedLayout
    <div className="w-full max-w-4xl mx-auto content-studio-container">
      <CardHeader className="px-0 mb-6 flex-shrink-0">
        <div className="flex items-center space-x-3">
            <Paintbrush className="w-10 h-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Content Studio</CardTitle>
              <p className="text-lg text-muted-foreground">
                Generate images, social media posts, and blog articles powered by AI.
              </p>
            </div>
          </div>
      </CardHeader>

      <Tabs defaultValue="image" value={activeTab} onValueChange={setActiveTab} className="w-full content-studio-tabs">
        <TabsList className="grid w-full grid-cols-3 mb-6 flex-shrink-0">
          <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" />Image Generation</TabsTrigger>
          <TabsTrigger value="social"><MessageSquareText className="w-4 h-4 mr-2" />Social Media Post</TabsTrigger>
          <TabsTrigger value="blog"><Newspaper className="w-4 h-4 mr-2" />Blog Post</TabsTrigger>
        </TabsList>

        {/* Image Generation Tab */}
        <TabsContent value="image" className="content-studio-tab-content">
          <div className="content-studio-scroll-area">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Generate Brand Images</CardTitle>
              <p className="text-sm text-muted-foreground">Create unique images. Uses brand description, industry, and style. Optionally use an example image from your Brand Profile.</p>
                {lastUsedImageProvider && <p className="text-xs text-primary mt-1">Image(s) last generated using: {isAdmin ? lastUsedImageProvider : "Gemini (Google AI)"}</p>}
            </CardHeader>
            {/* Conditional rendering for preview mode (admin) vs direct form (non-admin) */}
            {isAdmin && isPreviewingPrompt ? (
              // Admin is previewing prompt
              <form onSubmit={handleImageGenerationSubmit}>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="editablePromptTextarea" className="flex items-center mb-1"><Edit className="w-4 h-4 mr-2 text-primary" />Final Prompt (Editable)</Label>
                    <Textarea
                      id="editablePromptTextarea"
                      value={currentTextPromptForEditing}
                      onChange={(e) => setCurrentTextPromptForEditing(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                      placeholder="The constructed prompt will appear here. You can edit it before generation."
                    />
                      <p className="text-xs text-muted-foreground">
                      Note: For Freepik, structural parameters (aspect ratio, specific styles/effects) are set separately and won't be textually appended here by default if you edit this prompt. Editing this prompt gives most control to Gemini.
                      </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsPreviewingPrompt(false); setFormSnapshot(null);}} className="w-full sm:w-auto">
                      Back to Edit Fields
                  </Button>
                  <SubmitButton className="w-full sm:flex-1" loadingText={parseInt(formSnapshot?.numberOfImages?.toString() || "1") > 1 ? "Generating Images..." : "Generating Image..."}>
                      Generate {parseInt(formSnapshot?.numberOfImages?.toString() || "1") > 1 ? `${formSnapshot?.numberOfImages} Images` : "Image"} with This Prompt
                  </SubmitButton>
                </CardFooter>
              </form>
            ) : (
              // Admin is in form fields mode OR it's a Non-Admin user (direct generation)
              <form id="imageGenerationFormFields" onSubmit={isAdmin ? (e) => e.preventDefault() : handleImageGenerationSubmit}>
                <CardContent className="space-y-6">
                  {isAdmin && ( // Provider selection only for admin
                    <div>
                      <Label htmlFor="imageGenProviderSelect" className="flex items-center mb-1"><Server className="w-4 h-4 mr-2 text-primary" />Image Generation Provider</Label>
                      <Select value={selectedImageProvider || ''} onValueChange={(value) => setSelectedImageProvider(value as GenerateImagesInput['provider'])}>
                          <SelectTrigger id="imageGenProviderSelect">
                              <SelectValue placeholder="Select image generation provider" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectGroup>
                                  <SelectLabel>Providers</SelectLabel>
                                  {imageGenerationProviders.map(provider => (
                                      <SelectItem key={provider.value} value={provider.value} disabled={provider.disabled}>
                                          {provider.label}
                                      </SelectItem>
                                  ))}
                              </SelectGroup>
                          </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="imageGenBrandDescription" className="flex items-center mb-1"><FileText className="w-4 h-4 mr-2 text-primary" />Brand Description (from Profile)</Label>
                    <Textarea
                      id="imageGenBrandDescription"
                      name="brandDescription"
                      value={imageGenBrandDescription}
                      onChange={(e) => setImageGenBrandDescription(e.target.value)}
                      placeholder="Detailed description of the brand and its values."
                      rows={3}
                    />
                  </div>
                    <div>
                      <Label htmlFor="imageGenIndustry" className="flex items-center mb-1"><Briefcase className="w-4 h-4 mr-2 text-primary" />Industry (from Profile)</Label>
                      <Select
                          value={imageGenIndustry && imageGenIndustry.trim() !== "" ? imageGenIndustry : "_none_"}
                          onValueChange={setImageGenIndustry}
                          name="industry"
                      >
                          <SelectTrigger id="imageGenIndustry">
                              <SelectValue placeholder="Select industry">
                                  {imageGenIndustry && imageGenIndustry !== "_none_"
                                      ? industries.find(ind => ind.value === imageGenIndustry)?.label || imageGenIndustry
                                      : "None / Not Applicable"
                                  }
                              </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                              <SelectGroup>
                                  <SelectLabel>Industries</SelectLabel>
                                  {industries.map(industry => (
                                      <SelectItem key={industry.value} value={industry.value}>
                                          {industry.label}
                                      </SelectItem>
                                  ))}
                              </SelectGroup>
                          </SelectContent>
                      </Select>
                        <p className="text-xs text-muted-foreground mt-1">"None / Not Applicable" means no specific industry context will be sent to AI.</p>
                  </div>

                  <div>
                    <Label htmlFor="imageGenImageStylePresetSelect" className="flex items-center mb-1"><Palette className="w-4 h-4 mr-2 text-primary" />Image Style Preset</Label>
                    <Select
                      name="imageStylePreset"
                      value={selectedImageStylePreset}
                      onValueChange={setSelectedImageStylePreset}
                    >
                        <SelectTrigger id="imageGenImageStylePresetSelect">
                            <SelectValue placeholder="Select image style preset" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Artistic Styles</SelectLabel>
                                {imageStylePresets.map(style => (
                                    <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                      <p className="text-xs text-muted-foreground mt-1">Some styles are more effective with specific providers. Notes below can add detail. Freepik styles are best with Freepik provider.</p>
                  </div>

                  <div>
                    <Label htmlFor="imageGenCustomStyleNotes" className="flex items-center mb-1"><Edit className="w-4 h-4 mr-2 text-primary" />Custom Style Notes (from Profile)</Label>
                    <Textarea
                      id="imageGenCustomStyleNotes"
                      name="customStyleNotes"
                      value={customStyleNotesInput}
                      onChange={(e) => setCustomStyleNotesInput(e.target.value)}
                      placeholder="E.g., 'add a touch of vintage', 'focus on metallic textures'. These notes are added to the main text prompt."
                      rows={2}
                    />
                  </div>
                  
                  {/* New Checkbox for using example image */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useExampleImageForGen"
                      checked={useExampleImageForGen}
                      onCheckedChange={(checked) => setUseExampleImageForGen(checked as boolean)}
                    />
                    <Label htmlFor="useExampleImageForGen" className="text-sm font-medium">
                      Use Example Image from Profile as Reference?
                    </Label>
                  </div>

                  {/* Conditional rendering for example image selection */}
                  {useExampleImageForGen && (
                    <div>
                        <Label className="flex items-center mb-1">
                            <ImageIcon className="w-4 h-4 mr-2 text-primary" />Example Image from Profile
                        </Label>
                          {brandData?.exampleImages && brandData.exampleImages.length > 0 ? (
                            <div className="mt-2 space-y-2">
                                {brandData.exampleImages.length > 1 ? (
                                    <>
                                    <p className="text-xs text-muted-foreground">Select Profile Image to Use as Reference:</p>
                                    <div className="flex space-x-2 overflow-x-auto pb-2">
                                        {brandData.exampleImages.map((imgSrc, index) => (
                                            <button
                                                type="button"
                                                key={`gen-profile-${index}`}
                                                onClick={() => setSelectedProfileImageIndexForGen(index)}
                                                className={cn(
                                                    "w-20 h-20 rounded border-2 p-0.5 flex-shrink-0 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring",
                                                    selectedProfileImageIndexForGen === index ? "border-primary ring-2 ring-primary" : "border-border"
                                                )}
                                            >
                                                <NextImage src={imgSrc} alt={`Example ${index + 1}`} width={76} height={76} className="object-contain w-full h-full rounded-sm" data-ai-hint="style example"/>
                                            </button>
                                        ))}
                                    </div>
                                    </>
                                  ) : ( 
                                      <div className="w-20 h-20 rounded border-2 p-0.5 border-primary ring-2 ring-primary flex-shrink-0">
                                          <NextImage src={brandData.exampleImages[0]} alt={`Example 1`} width={76} height={76} className="object-contain w-full h-full rounded-sm" data-ai-hint="style example"/>
                                      </div>
                                  )}
                                { currentExampleImageForGen && ( // currentExampleImageForGen already respects useExampleImageForGen
                                    <p className="text-xs text-muted-foreground">
                                        Using image {selectedProfileImageIndexForGen !== null && brandData.exampleImages && brandData.exampleImages.length > 1 ? selectedProfileImageIndexForGen + 1 : "1"} as reference.
                                        {selectedImageProvider === 'FREEPIK' && isAdmin && " (Freepik/Imagen3 uses AI description of this image, not the image directly for text-to-image.)"}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-1">No example images in Brand Profile to select.</p>
                        )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="imageGenNegativePrompt" className="flex items-center mb-1"><CircleSlash className="w-4 h-4 mr-2 text-primary" />Negative Prompt (Optional)</Label>
                    <Textarea
                      id="imageGenNegativePrompt"
                      name="negativePrompt"
                      value={imageGenNegativePrompt}
                      onChange={(e) => setImageGenNegativePrompt(e.target.value)}
                      placeholder="E.g., avoid text, ugly, disfigured, low quality"
                      rows={2}
                    />
                  </div>
                  
                  {/* Freepik specific options only for admin and when Freepik is selected */}
                  {isAdmin && selectedImageProvider === 'FREEPIK' && (
                      <>
                          <div className="pt-4 mt-4 border-t">
                              <h4 className="text-md font-semibold mb-3 text-primary flex items-center"><Paintbrush className="w-5 h-5 mr-2"/>Freepik Specific Styling (imagen3 model)</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <Label htmlFor="freepikDominantColorsInput" className="flex items-center mb-1"><PaletteIcon className="w-4 h-4 mr-2 text-primary" />Dominant Colors</Label>
                                  <Input
                                      id="freepikDominantColorsInput"
                                      name="freepikDominantColorsInput"
                                      value={freepikDominantColorsInput}
                                      onChange={(e) => setFreepikDominantColorsInput(e.target.value)}
                                      placeholder="Up to 5 hex codes, e.g., #FF0000,#00FF00"
                                  />
                                  <p className="text-xs text-muted-foreground">Comma-separated hex codes. (Freepik imagen3 specific)</p>
                              </div>
                              <div>
                                  <Label htmlFor="freepikEffectColor" className="flex items-center mb-1"><Paintbrush className="w-4 h-4 mr-2 text-primary" />Effect - Color</Label>
                                  <Select name="freepikEffectColor" value={freepikEffectColor} onValueChange={setFreepikEffectColor}>
                                      <SelectTrigger id="freepikEffectColor"><SelectValue placeholder="Select Freepik color effect" /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          {freepikImagen3EffectColors.map(effect => <SelectItem key={effect.value} value={effect.value}>{effect.label}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                    <p className="text-xs text-muted-foreground">(Freepik imagen3 specific)</p>
                              </div>
                              <div>
                                  <Label htmlFor="freepikEffectLightning" className="flex items-center mb-1"><Zap className="w-4 h-4 mr-2 text-primary" />Effect - Lightning</Label>
                                  <Select name="freepikEffectLightning" value={freepikEffectLightning} onValueChange={setFreepikEffectLightning}>
                                      <SelectTrigger id="freepikEffectLightning"><SelectValue placeholder="Select Freepik lightning effect" /></SelectTrigger>
                                      <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                          {freepikImagen3EffectLightnings.map(effect => <SelectItem key={effect.value} value={effect.value}>{effect.label}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                    <p className="text-xs text-muted-foreground">(Freepik imagen3 specific)</p>
                              </div>
                              <div>
                                  <Label htmlFor="freepikEffectFraming" className="flex items-center mb-1"><Aperture className="w-4 h-4 mr-2 text-primary" />Effect - Framing</Label>
                                  <Select name="freepikEffectFraming" value={freepikEffectFraming} onValueChange={setFreepikEffectFraming}>
                                      <SelectTrigger id="freepikEffectFraming"><SelectValue placeholder="Select Freepik framing effect" /></SelectTrigger>
                                      <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                          {freepikImagen3EffectFramings.map(effect => <SelectItem key={effect.value} value={effect.value}>{effect.label}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                    <p className="text-xs text-muted-foreground">(Freepik imagen3 specific)</p>
                              </div>
                          </div>
                      </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="imageGenAspectRatioSelect" className="flex items-center mb-1"><Ratio className="w-4 h-4 mr-2 text-primary" />Aspect Ratio</Label>
                        <Select
                          name="aspectRatio"
                          required
                          value={selectedAspectRatio}
                          onValueChange={setSelectedAspectRatio}
                        >
                        <SelectTrigger id="imageGenAspectRatioSelect">
                            <SelectValue placeholder="Select aspect ratio" />
                        </SelectTrigger>
                        <SelectContent>
                            {currentAspectRatioOptions.map(ar => (
                              <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="numberOfImagesSelect" className="flex items-center mb-1"><Images className="w-4 h-4 mr-2 text-primary" />Number of Images</Label>
                        <Select name="numberOfImages" value={numberOfImagesToGenerate} onValueChange={setNumberOfImagesToGenerate}>
                            <SelectTrigger id="numberOfImagesSelect">
                                <SelectValue placeholder="Select number" />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4].map(num => (
                                    <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="imageGenSeed" className="flex items-center mb-1"><Pipette className="w-4 h-4 mr-2 text-primary" />Seed (Optional)</Label>
                    <Input
                      id="imageGenSeed"
                      name="seed"
                      type="number"
                      value={imageGenSeed || ""}
                      onChange={(e) => setImageGenSeed(e.target.value)}
                      placeholder="Enter a number for reproducible results"
                      min="0"
                      disabled={selectedImageProvider === 'FREEPIK'}
                    />
                      <p className="text-xs text-muted-foreground">
                        {(isAdmin && selectedImageProvider === 'FREEPIK') ? "Seed is ignored for Freepik/Imagen3 UI integration." : "Seed might not be strictly enforced by all models."}
                      </p>
                  </div>
                </CardContent>
                <CardFooter>
                  {isAdmin ? (
                    <Button type="button" onClick={handlePreviewPromptClick} className="w-full">
                        <Eye className="mr-2 h-4 w-4" /> Preview Prompt
                    </Button>
                  ) : (
                    // Non-admin direct generation button (form's onSubmit handles this)
                    <SubmitButton 
                        className="w-full" 
                        loadingText={parseInt(numberOfImagesToGenerate,10) > 1 ? "Generating Images..." : "Generating Image..."}
                        type="submit" // This button now submits the main form for non-admins
                    >
                        Generate {parseInt(numberOfImagesToGenerate,10) > 1 ? `${numberOfImagesToGenerate} Images` : "Image"}
                    </SubmitButton>
                  )}
                </CardFooter>
              </form> // This form is now used by both admin (fields mode) and non-admin (direct generation)
            )} {/* End of conditional rendering for admin preview mode vs form fields/direct gen */}

            {lastSuccessfulGeneratedImageUrls.length > 0 && (
              <Card className="mt-6 mx-4 mb-4 shadow-sm">
                  <CardHeader>
                      <div className="flex justify-between items-center">
                          <CardTitle className="text-xl flex items-center">
                              <ImageIcon className="w-5 h-5 mr-2 text-primary" />
                              Generated Image{lastSuccessfulGeneratedImageUrls.length > 1 ? 's' : ''}
                              {lastUsedImageProvider && <span className="text-xs text-muted-foreground ml-2">(via {lastUsedImageProvider})</span>}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                              {lastSuccessfulGeneratedImageUrls.some(url => url?.startsWith('data:') || url.startsWith('image_url:')) && (
                                    <Button
                                      type="button"
                                      onClick={handleSaveAllGeneratedImages}
                                      disabled={isSavingImages || !lastSuccessfulGeneratedImageUrls.some(url => url?.startsWith('data:') || url.startsWith('image_url:'))}
                                      size="sm"
                                  >
                                      {isSavingImages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                      Save All to Library
                                  </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={handleClearGeneratedImages}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Clear Image{lastSuccessfulGeneratedImageUrls.length > 1 ? 's' : ''}
                              </Button>
                          </div>
                      </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid gap-4 ${lastSuccessfulGeneratedImageUrls.length > 1 ? (lastSuccessfulGeneratedImageUrls.length > 2 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2') : 'grid-cols-1'}`}>
                      {lastSuccessfulGeneratedImageUrls.map((url, index) => (
                          <div key={url || index} className="relative group w-full overflow-hidden border rounded-md bg-muted aspect-square">
                              {url && (url.startsWith('data:') || url.startsWith('image_url:')) ? (
                                  <>
                                  <NextImage
                                      src={url.startsWith('image_url:') ? url.substring(10) : url}
                                      alt={`Generated brand image ${index + 1}`}
                                      fill
                                      style={{objectFit: 'contain'}}
                                      data-ai-hint="brand marketing"
                                      className="transition-opacity duration-300 opacity-100 group-hover:opacity-80"
                                  />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 z-10 bg-background/70 hover:bg-background"
                                      onClick={() => downloadImage(url.startsWith('image_url:') ? url.substring(10) : url, `generated-image-${index + 1}.png`)}
                                      title="Download image"
                                    >
                                      <Download className="h-4 w-4"/>
                                    </Button>
                                  </>
                              ) : url && url.startsWith('task_id:') ? (
                                    <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground p-2 text-center">
                                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                      Freepik image task pending. <br/> Task ID: {url.substring(8).substring(0,8)}...
                                      <form>
                                        <input type="hidden" name="taskId" value={url.substring(8)} />
                                        <SubmitButton
                                          size="sm"
                                          variant="outline"
                                          loadingText="Checking..."
                                          formAction={(formData) => { 
                                              setCheckingTaskId(url.substring(8));
                                              freepikTaskStatusAction(formData);
                                          }}
                                          disabled={checkingTaskId === url.substring(8)}
                                          className="mt-2"
                                        >
                                          {checkingTaskId === url.substring(8) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                                          Check Status
                                        </SubmitButton>
                                      </form>
                                  </div>
                              ) : (
                                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Image not available</div>
                              )}
                          </div>
                      ))}
                    </div>
                    {isAdmin && lastUsedImageGenPrompt && ( // Hide "Prompt Used" for non-admins
                      <div className="mt-4">
                          <div className="flex justify-between items-center mb-1">
                              <Label htmlFor="usedImagePromptDisplay" className="flex items-center text-sm font-medium"><FileText className="w-4 h-4 mr-2 text-primary" />Prompt Used:</Label>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(lastUsedImageGenPrompt || "", "Prompt")} className="text-muted-foreground hover:text-primary">
                                  <Copy className="w-3 h-3 mr-1" /> Copy Prompt
                              </Button>
                          </div>
                          <Textarea
                              id="usedImagePromptDisplay"
                              value={lastUsedImageGenPrompt || ""}
                              onChange={(e) => setLastUsedImageGenPrompt(e.target.value)}
                              rows={Math.min(10, (lastUsedImageGenPrompt?.match(/\n/g) || []).length + 2)}
                              className="text-xs bg-muted/50 font-mono"
                              placeholder="The prompt used for generation will appear here. You can edit it for your reference or to copy elsewhere."
                          />
                      </div>
                    )}
                      <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleUseGeneratedImageForSocial}
                      disabled={!lastSuccessfulGeneratedImageUrls.some(url => url?.startsWith('data:') || url.startsWith('image_url:'))}
                    >
                      <ImageUp className="mr-2 h-4 w-4" /> Use First Image for Social Post
                    </Button>
                  </CardContent>
              </Card>
            )}
          </Card>
          </div>
        </TabsContent>

        {/* Social Media Post Tab */}
        <TabsContent value="social" className="content-studio-tab-content">
          <div className="content-studio-scroll-area">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><MessageSquareText className="w-6 h-6 mr-2 text-primary"/>Create Social Media Post</CardTitle>
              <p className="text-sm text-muted-foreground">Generate engaging captions and hashtags. Uses brand description, industry, image description (optional), and selected tone.</p>
            </CardHeader>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const currentFormData = new FormData(e.currentTarget);
                    handleSocialSubmit(currentFormData);
                }}
            >
              <input type="hidden" name="industry" value={brandData?.industry === "_none_" ? "" : brandData?.industry || ""} />
              <input type="hidden" name="selectedImageSrcForSocialPost" value={useImageForSocialPost && currentSocialImagePreviewUrl ? currentSocialImagePreviewUrl : ""} />
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                      <Checkbox
                          id="useImageForSocialPost"
                          checked={useImageForSocialPost}
                          onCheckedChange={(checked) => {
                              const isChecked = checked as boolean;
                              setUseImageForSocialPost(isChecked);
                              if (!isChecked) {
                                  setSocialImageChoice(null);
                              } else if (!socialImageChoice && lastSuccessfulGeneratedImageUrls.some(url => url?.startsWith('data:') || url?.startsWith('image_url:'))) {
                                  setSocialImageChoice('generated');
                              } else if (!socialImageChoice && brandData?.exampleImages?.[selectedProfileImageIndexForSocial !== null ? selectedProfileImageIndexForSocial : 0]) {
                                  setSocialImageChoice('profile');
                                  if(selectedProfileImageIndexForSocial === null && brandData?.exampleImages?.length > 0) setSelectedProfileImageIndexForSocial(0);
                              } else if (!socialImageChoice) {
                                    setSocialImageChoice(null);
                              }
                          }}
                      />
                      <Label htmlFor="useImageForSocialPost" className="text-base font-medium">
                          Use an image for this post?
                      </Label>
                  </div>

                  {useImageForSocialPost && (
                    <div className="pl-6 space-y-4">
                      <RadioGroup
                          value={socialImageChoice || ""}
                          onValueChange={(value) => setSocialImageChoice(value as 'generated' | 'profile' | null)}
                          className="space-y-2"
                      >
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="generated" id="social-generated" disabled={!lastSuccessfulGeneratedImageUrls.some(url => url?.startsWith('data:') || url?.startsWith('image_url:'))}/>
                              <Label htmlFor="social-generated" className={(!lastSuccessfulGeneratedImageUrls.some(url => url?.startsWith('data:') || url?.startsWith('image_url:'))) ? "text-muted-foreground" : ""}>
                                  Use Last Generated Image {(!lastSuccessfulGeneratedImageUrls.some(url => url?.startsWith('data:') || url?.startsWith('image_url:'))) ? "(None available/suitable)" : `(First of ${lastSuccessfulGeneratedImageUrls.filter(url => url?.startsWith('data:') || url?.startsWith('image_url:')).length} available will be used)`}
                              </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="profile" id="social-profile" disabled={!brandData?.exampleImages || brandData.exampleImages.length === 0} />
                              <Label htmlFor="social-profile" className={(!brandData?.exampleImages || brandData.exampleImages.length === 0) ? "text-muted-foreground" : ""}>
                                  Use Brand Profile Example Image {!brandData?.exampleImages || brandData.exampleImages.length === 0 ? "(None available)" : `(${(brandData?.exampleImages?.length || 0)} available)`}
                              </Label>
                          </div>
                      </RadioGroup>

                      {socialImageChoice === 'profile' && brandData?.exampleImages && brandData.exampleImages.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {brandData.exampleImages.length > 1 ? (
                                  <>
                                  <p className="text-xs text-muted-foreground mb-1">Select Profile Image for Social Post:</p>
                                  <div className="flex space-x-2 overflow-x-auto pb-2">
                                      {brandData.exampleImages.map((imgSrc, index) => (
                                          <button
                                              type="button"
                                              key={`social-profile-${index}`}
                                              onClick={() => setSelectedProfileImageIndexForSocial(index)}
                                              className={cn(
                                                  "w-16 h-16 rounded border-2 p-0.5 flex-shrink-0 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring",
                                                  selectedProfileImageIndexForSocial === index ? "border-primary ring-2 ring-primary" : "border-border"
                                              )}
                                          >
                                              <NextImage src={imgSrc} alt={`Profile Example ${index + 1}`} width={60} height={60} className="object-contain w-full h-full rounded-sm" data-ai-hint="social media reference"/>
                                          </button>
                                      ))}
                                  </div>
                                  </>
                                ) : brandData?.exampleImages?.[0] ? (
                                  <div className="w-16 h-16 rounded border-2 p-0.5 border-primary ring-2 ring-primary flex-shrink-0">
                                        <NextImage src={brandData.exampleImages[0]} alt={`Profile Example 1`} width={60} height={60} className="object-contain w-full h-full rounded-sm" data-ai-hint="social media reference"/>
                                    </div>
                                ) : null}
                              {selectedProfileImageIndexForSocial !== null && brandData?.exampleImages?.[selectedProfileImageIndexForSocial] && (
                                <p className="text-xs text-muted-foreground">Using image {brandData.exampleImages.length > 1 ? selectedProfileImageIndexForSocial + 1 : '1'} from profile.</p>
                              )}
                            </div>
                      )}
                    </div>
                  )}

                  {currentSocialImagePreviewUrl && useImageForSocialPost && (
                      <div className="pl-6 mt-2 mb-3">
                          <p className="text-sm font-medium mb-1 text-muted-foreground">Selected image for post:</p>
                            <div className="relative w-40 h-40 border rounded-md overflow-hidden mb-2">
                              <NextImage
                                src={currentSocialImagePreviewUrl}
                                alt="Selected image for social post"
                                fill
                                style={{objectFit: 'contain'}} data-ai-hint="social content" />
                          </div>
                      </div>
                    )}
                    {useImageForSocialPost && !currentSocialImagePreviewUrl && (
                      <p className="pl-6 text-xs text-muted-foreground mb-3">No image selected or available for the social post.</p>
                    )}
                </div>

                <div>
                  <Label htmlFor="socialBrandDescription" className="flex items-center mb-1"><FileText className="w-4 h-4 mr-2 text-primary" />Brand Description (from Profile)</Label>
                  <Textarea
                    id="socialBrandDescription"
                    name="brandDescription"
                    defaultValue={brandData?.brandDescription || ""}
                    placeholder="Your brand's essence."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="socialImageDescription" className="flex items-center"><UserSquare className="w-4 h-4 mr-2 text-primary" />Image Description {useImageForSocialPost && currentSocialImagePreviewUrl ? '' : '(Optional)'}</Label>
                      {useImageForSocialPost && currentSocialImagePreviewUrl && (
                          <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAIDescribeImage}
                              disabled={isGeneratingDescription}
                          >
                              {isGeneratingDescription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                              AI Describe Image
                          </Button>
                      )}
                  </div>
                  <Textarea
                    id="socialImageDescription"
                    name="socialImageDescription"
                    placeholder={useImageForSocialPost && !!currentSocialImagePreviewUrl ? "Describe the image you're posting or use AI. Required if image used." : "Optionally describe the theme if not using an image."}
                    rows={3}
                    required={useImageForSocialPost && !!currentSocialImagePreviewUrl}
                  />
                </div>

                  <div>
                  <Label htmlFor="socialToneSelect" className="flex items-center mb-1"><ThumbsUp className="w-4 h-4 mr-2 text-primary" />Tone</Label>
                    <Select name="tone" required value={socialToneValue} onValueChange={setSocialToneValue}>
                      <SelectTrigger id="socialToneSelect">
                        <SelectValue placeholder="Select a tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="funny">Funny</SelectItem>
                        <SelectItem value="informative">Informative</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                  <div>
                  <Label htmlFor="customSocialToneNuances" className="flex items-center mb-1"><Edit className="w-4 h-4 mr-2 text-primary" />Custom Tone Nuances (Optional)</Label>
                  <Input
                    id="customSocialToneNuances"
                    name="customSocialToneNuances"
                    value={customSocialToneNuances}
                    onChange={(e) => setCustomSocialToneNuances(e.target.value)}
                    placeholder="e.g., 'but slightly urgent', 'with a touch of humor'"
                  />
                  <p className="text-xs text-muted-foreground">This will be appended to the selected tone.</p>
                </div>
              </CardContent>
              <CardFooter>
                <SubmitButton className="w-full" loadingText="Generating Content..." disabled={socialSubmitDisabled}>Generate Social Post</SubmitButton>
              </CardFooter>
            </form>
              {generatedSocialPost && (
                <Card className="mt-6 mx-4 mb-4 shadow-sm">
                  <CardHeader>
                      <CardTitle className="text-xl flex items-center">
                          <MessageSquareText className="w-5 h-5 mr-2 text-primary" />
                          Generated Social Post
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Image and text ready! Download the image (if applicable) and copy the caption/hashtags to post on Instagram.
                      </p>
                      {generatedSocialPost.imageSrc && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-1 text-muted-foreground">Associated Image:</p>
                              <div className="relative w-40 h-40 border rounded-md overflow-hidden mb-2">
                                  {generatedSocialPost?.imageSrc && <NextImage
                                    src={generatedSocialPost.imageSrc}
                                    alt="Social post image"
                                    fill
                                    style={{objectFit: 'contain'}} data-ai-hint="social content" />}
                              </div>
                              {generatedSocialPost?.imageSrc && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadImage(generatedSocialPost.imageSrc || "", `social-post-${new Date().getTime()}.png`)}
                                >
                                  <Download className="mr-2 h-4 w-4"/> Download Image
                                </Button>
                              )}
                          </div>
                      )}
                      <div>
                          <Label htmlFor="generatedCaption" className="text-sm font-medium mb-1 text-muted-foreground">Generated Caption:</Label>
                          <div className="p-3 border rounded-md bg-muted/50">
                              <p id="generatedCaption" className="text-sm whitespace-pre-wrap">{generatedSocialPost.caption}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedSocialPost.caption, "Caption")} className="mt-1 text-muted-foreground hover:text-primary">
                              <Copy className="w-3 h-3 mr-1" /> Copy Caption
                          </Button>
                      </div>
                      <div>
                          <Label htmlFor="generatedHashtags" className="text-sm font-medium mb-1 text-muted-foreground">Generated Hashtags:</Label>
                          <div className="p-3 border rounded-md bg-muted/50">
                              <p id="generatedHashtags" className="text-sm">{generatedSocialPost.hashtags}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedSocialPost.hashtags, "Hashtags")} className="mt-1 text-muted-foreground hover:text-primary">
                              <Copy className="w-3 h-3 mr-1" /> Copy Hashtags
                          </Button>
                      </div>
                  </CardContent>
                </Card>
            )}
          </Card>
          </div>
        </TabsContent>

        {/* Blog Post Tab */}
        <TabsContent value="blog" className="content-studio-tab-content">
          <div className="content-studio-scroll-area">
            <form action={blogAction} className="w-full">
              <Card className="shadow-lg">
                  <CardHeader>
                      <CardTitle className="text-xl flex items-center"><Newspaper className="w-6 h-6 mr-2 text-primary"/>Create Blog Content</CardTitle>
                      <p className="text-sm text-muted-foreground">Generate SEO-friendly blog posts. Define an outline, choose a tone, and let AI write the content.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div>
                          <Label htmlFor="blogBrandName" className="flex items-center mb-1"><Type className="w-4 h-4 mr-2 text-primary" />Brand Name (from Profile)</Label>
                          <Input
                          id="blogBrandName"
                          name="brandName"
                          defaultValue={brandData?.brandName || ""}
                          placeholder="Your brand's name"
                          />
                      </div>
                      <div>
                          <Label htmlFor="blogBrandDescription" className="flex items-center mb-1"><FileText className="w-4 h-4 mr-2 text-primary" />Brand Description (from Profile)</Label>
                          <Textarea
                          id="blogBrandDescription"
                          name="blogBrandDescription"
                          defaultValue={brandData?.brandDescription || ""}
                          placeholder="Detailed brand description"
                          rows={3}
                          />
                      </div>
                      <div>
                          <Label htmlFor="blogIndustry" className="flex items-center mb-1"><Briefcase className="w-4 h-4 mr-2 text-primary" />Industry (from Profile)</Label>
                          <Select
                              name="industry"
                              value={selectedBlogIndustry && selectedBlogIndustry.trim() !== "" ? selectedBlogIndustry : "_none_"}
                              onValueChange={setSelectedBlogIndustry}
                          >
                              <SelectTrigger id="blogIndustrySelectTrigger">
                                  <SelectValue placeholder="Select industry">
                                      {selectedBlogIndustry && selectedBlogIndustry !== "_none_"
                                          ? industries.find(ind => ind.value === selectedBlogIndustry)?.label || selectedBlogIndustry
                                          : "None / Not Applicable"
                                      }
                                  </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                  {industries.map(industry => (
                                      <SelectItem key={industry.value} value={industry.value}>
                                          {industry.label}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label htmlFor="blogKeywords" className="flex items-center mb-1"><Tag className="w-4 h-4 mr-2 text-primary" />Keywords (from Profile)</Label>
                          <Input
                          id="blogKeywords"
                          name="blogKeywords"
                          defaultValue={brandData?.targetKeywords || ""}
                          placeholder="Comma-separated keywords (e.g., AI, marketing, branding)"
                          />
                      </div>
                      <div>
                          <Label htmlFor="blogWebsiteUrl" className="flex items-center mb-1"><Globe className="w-4 h-4 mr-2 text-primary" />Website URL (Optional, for SEO & Outline)</Label>
                          <Input
                              id="blogWebsiteUrl"
                              name="blogWebsiteUrl"
                              defaultValue={brandData?.websiteUrl || ""}
                              placeholder="https://www.example.com"
                          />
                      </div>

                      <div className="space-y-2">
                          <Label htmlFor="blogToneSelect" className="flex items-center mb-1"><Mic2 className="w-4 h-4 mr-2 text-primary" />Tone/Style for Blog</Label>
                          <Select name="blogTone" value={selectedBlogTone} onValueChange={setSelectedBlogTone}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a tone/style" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectGroup>
                                      <SelectLabel>Blog Tones/Styles</SelectLabel>
                                      {blogTones.map(tone => (
                                          <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                                      ))}
                                  </SelectGroup>
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="space-y-2">
                          <div className="flex justify-between items-center mb-1">
                              <Label htmlFor="blogOutline" className="flex items-center"><ListOrdered className="w-4 h-4 mr-2 text-primary" />Blog Outline</Label>
                              <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleGenerateBlogOutline}
                                  disabled={isGeneratingOutline}
                              >
                                  {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                  Generate Outline with AI
                              </Button>
                          </div>
                          <Textarea
                          id="blogOutline"
                          name="blogOutline"
                          placeholder="Enter your blog outline here, or generate one with AI. Markdown is supported."
                          rows={8}
                          value={generatedBlogOutline}
                          onChange={(e) => setGeneratedBlogOutline(e.target.value)}
                          />
                            <p className="text-sm text-muted-foreground">AI will strictly follow this outline to generate the blog post.</p>
                      </div>

                      <div>
                          <Label htmlFor="blogTargetPlatformSelect" className="flex items-center mb-1"><Newspaper className="w-4 h-4 mr-2 text-primary" />Target Platform</Label>
                          <Select name="targetPlatform" value={blogPlatformValue} onValueChange={(value) => setBlogPlatformValue(value as "Medium" | "Other")}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Other">Other (Generic Blog)</SelectItem>
                          </SelectContent>
                          </Select>
                      </div>
                  </CardContent>
                  <CardFooter>
                  <SubmitButton className="w-full" loadingText="Generating Blog..." disabled={isGeneratingOutline || !generatedBlogOutline.trim()}>Generate Blog Post</SubmitButton>
                  </CardFooter>
              </Card>
              {generatedBlogPost && (
                <Card className="mt-6 mx-4 mb-4 shadow-sm">
                  <CardHeader>
                      <CardTitle className="text-xl flex items-center">
                          <Newspaper className="w-5 h-5 mr-2 text-primary" />
                          Generated Blog Post
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div>
                          <Label htmlFor="generatedBlogTitle" className="text-sm font-medium mb-1 text-muted-foreground">Generated Title:</Label>
                          <div className="p-3 border rounded-md bg-muted/50">
                              <p id="generatedBlogTitle" className="text-lg font-medium">{generatedBlogPost.title}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedBlogPost.title, "Title")} className="mt-1 text-muted-foreground hover:text-primary">
                              <Copy className="w-3 h-3 mr-1" /> Copy Title
                          </Button>
                      </div>
                      <div>
                          <Label htmlFor="generatedBlogContent" className="text-sm font-medium mb-1 text-muted-foreground">Generated Content:</Label>
                          <div className="p-3 prose border rounded-md bg-muted/50 max-w-none max-h-96 overflow-y-auto">
                              <p id="generatedBlogContent" className="whitespace-pre-wrap">{generatedBlogPost.content}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedBlogPost.content, "Content")} className="mt-1 text-muted-foreground hover:text-primary">
                              <Copy className="w-3 h-3 mr-1" /> Copy Content
                          </Button>
                      </div>
                      <div>
                          <Label htmlFor="generatedBlogTags" className="text-sm font-medium mb-1 text-muted-foreground">Generated Tags:</Label>
                          <div className="p-3 border rounded-md bg-muted/50">
                              <p id="generatedBlogTags" className="text-sm">{generatedBlogPost.tags}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedBlogPost.tags, "Tags")} className="mt-1 text-muted-foreground hover:text-primary">
                              <Copy className="w-3 h-3 mr-1" /> Copy Tags
                          </Button>
                      </div>
                  </CardContent>
                </Card>
            )}
          </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
