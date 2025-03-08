import React, { useState, useEffect, useRef } from "react";
import { fetchMediaItem } from "../../integrations/google";
import { Box } from "@mui/material";
import { randomizeArray } from "../../utils/randomizeArray";
import "./OrigamiPhotos.css";

// Define the image information interface
interface ImageInfo {
  id: string;
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  productUrl: string;
}

// Define the available layouts
enum LayoutType {
  SINGLE = "single",
  TWO_HORIZONTAL = "two_horizontal",
  TWO_VERTICAL = "two_vertical",
  THREE_MAIN_LEFT = "three_main_left",
  THREE_MAIN_RIGHT = "three_main_right",
  FOUR_GRID = "four_grid"
}

// Layout configuration interface
interface LayoutConfig {
  type: LayoutType;
  positions: { x: number; y: number; width: number; height: number }[];
  idealAspectRatios: number[];
}

// Transition types
enum TransitionType {
  SLIDE_LEFT = "slide_left",
  SLIDE_RIGHT = "slide_right",
  SLIDE_UP = "slide_up",
  SLIDE_DOWN = "slide_down",
  FOLD_HORIZONTAL = "fold_horizontal",
  FOLD_VERTICAL = "fold_vertical",
  FADE = "fade"
}

// Define a photo in display
interface DisplayPhoto {
  imageInfo: ImageInfo;
  position: { x: number; y: number; width: number; height: number };
  transition: TransitionType;
  entering: boolean;
  exiting: boolean;
  zIndex: number;
}

// Props for the OrigamiPhotos component
interface OrigamiPhotosProps {
  mediaItemIDs: string[];
  transitionDuration?: number;
  displayDuration?: number;
}

// Define the available layouts
const layouts: Record<LayoutType, LayoutConfig> = {
  [LayoutType.SINGLE]: {
    type: LayoutType.SINGLE,
    positions: [{ x: 0, y: 0, width: 100, height: 100 }],
    idealAspectRatios: [1.5]
  },
  [LayoutType.TWO_HORIZONTAL]: {
    type: LayoutType.TWO_HORIZONTAL,
    positions: [
      { x: 0, y: 0, width: 50, height: 100 },
      { x: 50, y: 0, width: 50, height: 100 }
    ],
    idealAspectRatios: [0.75, 0.75]
  },
  [LayoutType.TWO_VERTICAL]: {
    type: LayoutType.TWO_VERTICAL,
    positions: [
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 50, width: 100, height: 50 }
    ],
    idealAspectRatios: [2, 2]
  },
  [LayoutType.THREE_MAIN_LEFT]: {
    type: LayoutType.THREE_MAIN_LEFT,
    positions: [
      { x: 0, y: 0, width: 60, height: 100 },
      { x: 60, y: 0, width: 40, height: 50 },
      { x: 60, y: 50, width: 40, height: 50 }
    ],
    idealAspectRatios: [0.9, 1.2, 1.2]
  },
  [LayoutType.THREE_MAIN_RIGHT]: {
    type: LayoutType.THREE_MAIN_RIGHT,
    positions: [
      { x: 40, y: 0, width: 60, height: 100 },
      { x: 0, y: 0, width: 40, height: 50 },
      { x: 0, y: 50, width: 40, height: 50 }
    ],
    idealAspectRatios: [0.9, 1.2, 1.2]
  },
  [LayoutType.FOUR_GRID]: {
    type: LayoutType.FOUR_GRID,
    positions: [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 50, y: 0, width: 50, height: 50 },
      { x: 0, y: 50, width: 50, height: 50 },
      { x: 50, y: 50, width: 50, height: 50 }
    ],
    idealAspectRatios: [1, 1, 1, 1]
  }
};

// List of available transitions
const transitions: TransitionType[] = [
  TransitionType.SLIDE_LEFT,
  TransitionType.SLIDE_RIGHT,
  TransitionType.SLIDE_UP,
  TransitionType.SLIDE_DOWN,
  TransitionType.FOLD_HORIZONTAL,
  TransitionType.FOLD_VERTICAL,
  TransitionType.FADE
];

export function OrigamiPhotos({ mediaItemIDs, transitionDuration = 1500, displayDuration = 5000 }: OrigamiPhotosProps) {
  // State for loaded images, current layout, and display photos
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(LayoutType.SINGLE);
  const [displayPhotos, setDisplayPhotos] = useState<DisplayPhoto[]>([]);
  const [randomizedMediaItems, setRandomizedMediaItems] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const [nextLayoutChange, setNextLayoutChange] = useState<number>(0);
  
  // Queue of loaded images ready to be displayed
  const imageQueue = useRef<ImageInfo[]>([]);
  // Counter for tracking layout changes
  const layoutChangeCounter = useRef<number>(0);
  // Last change timestamp to enforce minimum display duration
  const lastChangeTimestamp = useRef<number>(Date.now());

  // Initialize with randomized media items
  useEffect(() => {
    if (mediaItemIDs.length > 0) {
      setRandomizedMediaItems(randomizeArray([...mediaItemIDs]));
    }
  }, [mediaItemIDs]);

  // Load images continuously in the background
  useEffect(() => {
    if (randomizedMediaItems.length === 0 || loadingImages) return;

    const loadImages = async () => {
      setLoadingImages(true);
      console.log('Loading images from IDs:', randomizedMediaItems.slice(0, 5));
      
      // Load at most 5 images at a time
      const imagesToLoad = Math.min(5, randomizedMediaItems.length);
      const newImages: ImageInfo[] = [];
      
      for (let i = 0; i < imagesToLoad; i++) {
        try {
          const id = randomizedMediaItems[i];
          console.log(`Fetching media item ${i+1}/${imagesToLoad}: ${id}`);
          const mediaItem = await fetchMediaItem(id);
          console.log('Received media item:', mediaItem);
          
          // Ensure we have a valid baseUrl
          if (!mediaItem.baseUrl) {
            console.error('Media item has no baseUrl:', mediaItem);
            continue;
          }
          
          const width = parseInt(mediaItem.mediaMetadata.width);
          const height = parseInt(mediaItem.mediaMetadata.height);
          const aspectRatio = width / height;
          
          // Format URL properly - ensure we use high quality image
          const url = mediaItem.baseUrl + (mediaItem.baseUrl.includes('?') ? '&' : '?') + 'w=1600';
          
          const imageInfo: ImageInfo = {
            id,
            url,
            width,
            height,
            aspectRatio,
            productUrl: mediaItem.productUrl
          };
          
          console.log('Created imageInfo with URL:', url);
          
          // Preload the image
          const img = new Image();
          img.src = imageInfo.url;
          console.log(`Preloading image: ${imageInfo.url}`);
          
          await new Promise<void>((resolve) => {
            img.onload = () => {
              console.log(`Image loaded successfully: ${imageInfo.url}`);
              resolve();
            };
            img.onerror = (err) => {
              console.error(`Failed to load image: ${imageInfo.url}`, err);
              resolve(); // Continue even if image fails to load
            };
          });
          
          newImages.push(imageInfo);
        } catch (error) {
          console.error("Error loading image:", error);
        }
      }
      
      console.log(`Loaded ${newImages.length} new images`);
      
      // Add new images to our image queue
      imageQueue.current = [...imageQueue.current, ...newImages];
      console.log('Image queue now has', imageQueue.current.length, 'images');
      
      // Remove the loaded items from randomizedMediaItems
      setRandomizedMediaItems(prev => prev.slice(imagesToLoad));
      setLoadingImages(false);
      
      // Always trigger layout update when new images are loaded
      if (imageQueue.current.length > 0) {
        console.log('Starting display with available images');
        // Use a short timeout to ensure state has updated
        setTimeout(() => updateLayout(), 100);
      }
    };
    
    loadImages();
  }, [randomizedMediaItems, loadingImages, displayPhotos.length]);

  // Select the best layout based on available images and their aspect ratios
  const selectBestLayout = (availableImages: ImageInfo[]): LayoutType => {
    // If we don't have enough images, choose a layout that works with what we have
    if (availableImages.length <= 1) return LayoutType.SINGLE;
    if (availableImages.length === 2) {
      // Choose between horizontal or vertical based on aspect ratios
      const avgAspectRatio = (availableImages[0].aspectRatio + availableImages[1].aspectRatio) / 2;
      return avgAspectRatio > 1 ? LayoutType.TWO_VERTICAL : LayoutType.TWO_HORIZONTAL;
    }
    
    // For more images, select randomly from layouts that can accommodate them
    const possibleLayouts = Object.values(layouts).filter(layout => layout.positions.length <= availableImages.length);
    return possibleLayouts[Math.floor(Math.random() * possibleLayouts.length)].type;
  };

  // Get a random transition type
  const getRandomTransition = (): TransitionType => {
    return transitions[Math.floor(Math.random() * transitions.length)];
  };

  // Function to update the layout and photos display
  const updateLayout = () => {
    console.log('updateLayout called');
    // Enforce minimum display duration
    const now = Date.now();
    if (now - lastChangeTimestamp.current < displayDuration) {
      console.log('Too soon for layout change, waiting...');
      return;
    }
    lastChangeTimestamp.current = now;
    
    // Even if we don't have many images, show what we have
    if (imageQueue.current.length === 0) {
      console.log('No images in queue, waiting for more...');
      return;
    }
    
    // Decide if we should keep some photos or replace all
    const keepSomePhotos = displayPhotos.length > 0 && Math.random() > 0.3;
    console.log(`Updating layout - keeping some photos: ${keepSomePhotos}`);
    
    // Select a new layout
    const newLayoutType = selectBestLayout(imageQueue.current);
    const newLayout = layouts[newLayoutType];
    console.log(`Selected layout: ${newLayoutType} with ${newLayout.positions.length} positions`);
    
    // Determine which photos to keep and which to replace
    let photosToKeep: DisplayPhoto[] = [];
    if (keepSomePhotos) {
      // Keep 1 photo if we have a multi-photo layout
      const photoToKeep = displayPhotos[Math.floor(Math.random() * displayPhotos.length)];
      photosToKeep = [photoToKeep];
      console.log('Keeping photo:', photoToKeep.imageInfo.id);
    }
    
    // Mark kept photos as not exiting or entering
    photosToKeep.forEach(photo => {
      photo.entering = false;
      photo.exiting = false;
    });
    
    // Mark all other current photos as exiting
    const exitingPhotos = displayPhotos
      .filter(p => !photosToKeep.includes(p))
      .map(p => ({ ...p, exiting: true, entering: false }));
    console.log(`${exitingPhotos.length} photos marked for exit`);
    
    // Calculate how many new photos we need
    const newPhotosNeeded = newLayout.positions.length - photosToKeep.length;
    console.log(`Need ${newPhotosNeeded} new photos`);
    
    // Get new photos from the queue
    const newPhotos: DisplayPhoto[] = [];
    for (let i = 0; i < newPhotosNeeded && imageQueue.current.length > 0; i++) {
      // Take a photo from the queue
      const imageInfo = imageQueue.current.shift()!;
      console.log(`Using photo from queue: ${imageInfo.id}`);
      
      // Find the best position for this photo based on aspect ratio
      let bestPositionIndex = i;
      if (photosToKeep.length > 0) {
        // Skip positions that are already occupied by kept photos
        const keptPositions = photosToKeep.map(p => newLayout.positions.findIndex(
          pos => pos.x === p.position.x && pos.y === p.position.y
        ));
        const availablePositions = newLayout.positions
          .map((_, index) => index)
          .filter(index => !keptPositions.includes(index));
        
        bestPositionIndex = availablePositions[i % availablePositions.length];
        console.log(`Position ${bestPositionIndex} selected for new photo`);
      }
      
      // Create new display photo
      const transition = getRandomTransition();
      newPhotos.push({
        imageInfo,
        position: newLayout.positions[bestPositionIndex],
        transition,
        entering: true,
        exiting: false,
        zIndex: 10 + i // New photos appear on top
      });
      console.log(`Added new photo with transition: ${transition}`);
    }
    
    // Combine kept, exiting, and new photos
    const allPhotos = [...exitingPhotos, ...photosToKeep, ...newPhotos];
    console.log(`Setting display photos: ${allPhotos.length} total (${exitingPhotos.length} exiting, ${photosToKeep.length} kept, ${newPhotos.length} new)`);
    setDisplayPhotos(allPhotos);
    setCurrentLayout(newLayoutType);
    
    // Schedule cleanup of exiting photos after transition
    setTimeout(() => {
      console.log('Cleaning up exiting photos');
      setDisplayPhotos(prev => prev.filter(p => !p.exiting));
    }, transitionDuration);
    
    // Schedule next layout change
    const nextChangeDelay = displayDuration + Math.random() * 1000;
    layoutChangeCounter.current++;
    setNextLayoutChange(layoutChangeCounter.current);
    console.log(`Scheduling next layout change in ${nextChangeDelay}ms`);
    setTimeout(() => {
      if (layoutChangeCounter.current === nextLayoutChange) {
        console.log('Executing scheduled layout change');
        updateLayout();
      }
    }, nextChangeDelay);
    
    // If our queue is getting low, trigger another loading cycle
    if (imageQueue.current.length < 3 && randomizedMediaItems.length > 0 && !loadingImages) {
      console.log('Image queue running low, triggering reload');
      setLoadingImages(false); // Force reload on next cycle
    }
  };

  // Get CSS class for a photo's transition
  const getTransitionClass = (photo: DisplayPhoto): string => {
    const baseClass = photo.entering ? "entering" : photo.exiting ? "exiting" : "";
    if (!baseClass) return "";
    
    return `${baseClass}-${photo.transition}`;
  };

  // Get transform style for 3D transitions
  const getTransformStyle = (photo: DisplayPhoto): React.CSSProperties => {
    if (!photo.entering && !photo.exiting) return {};
    
    switch (photo.transition) {
      case TransitionType.FOLD_HORIZONTAL:
        return {
          transformOrigin: photo.entering ? "center left" : "center right",
          perspective: "1000px",
        };
      case TransitionType.FOLD_VERTICAL:
        return {
          transformOrigin: photo.entering ? "top center" : "bottom center",
          perspective: "1000px",
        };
      default:
        return {};
    }
  };

  return (
    <Box className="origami-container">
      {/* Debug overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 2,
          borderRadius: 1,
          maxWidth: '300px',
        }}
      >
        <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
          {`Queue: ${imageQueue.current.length}
Display: ${displayPhotos.length}
Layout: ${currentLayout}`}
        </pre>
      </Box>

      {/* Render each photo */}
      {displayPhotos.map((photo, index) => (
        <Box
          key={`${photo.imageInfo.id}-${index}`}
          className={`origami-photo ${getTransitionClass(photo)}`}
          sx={{
            position: "absolute",
            left: `${photo.position.x}%`,
            top: `${photo.position.y}%`,
            width: `${photo.position.width}%`,
            height: `${photo.position.height}%`,
            zIndex: photo.zIndex,
            transition: `all ${transitionDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
            backgroundImage: `url(${photo.imageInfo.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: '1px solid rgba(255,255,255,0.3)', // Debug border
            ...getTransformStyle(photo)
          }}
        >
          {/* Debug info on each photo */}
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            color: 'white', 
            padding: '2px 5px',
            fontSize: '10px'
          }}>
            {photo.entering ? 'Entering' : photo.exiting ? 'Exiting' : 'Stable'}
          </Box>
        </Box>
      ))}

      {/* Fallback if no photos are displayed */}
      {displayPhotos.length === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center'
          }}
        >
          Waiting for photos...
        </Box>
      )}
    </Box>
  );
}
