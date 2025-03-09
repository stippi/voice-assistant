import React, { useState, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { fetchMediaItem } from "../../integrations/google";
import { randomizeArray } from "../../utils/randomizeArray";
import "./EnhancedOrigami.css";

// Define the image information interface
interface ImageInfo {
  id: string;
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
}

// Define the layout types
enum LayoutType {
  SINGLE = "single",
  TWO_HORIZONTAL = "two_horizontal",
  TWO_VERTICAL = "two_vertical",
  THREE_MAIN_LEFT = "three_main_left",
  THREE_MAIN_RIGHT = "three_main_right",
  FOUR_GRID = "four_grid"
}

// Layout configuration
interface LayoutConfig {
  type: LayoutType;
  positions: { x: number; y: number; width: number; height: number }[];
}

// Define a photo in display
interface DisplayPhoto {
  imageInfo: ImageInfo;
  position: { x: number; y: number; width: number; height: number };
  entering: boolean;
  exiting: boolean;
  zIndex: number;
}

// Props for the EnhancedOrigami component
interface EnhancedOrigamiProps {
  mediaItemIDs: string[];
  transitionDuration?: number;
  displayDuration?: number;
}

// Define the available layouts
const layouts: Record<LayoutType, LayoutConfig> = {
  [LayoutType.SINGLE]: {
    type: LayoutType.SINGLE,
    positions: [{ x: 0, y: 0, width: 100, height: 100 }]
  },
  [LayoutType.TWO_HORIZONTAL]: {
    type: LayoutType.TWO_HORIZONTAL,
    positions: [
      { x: 0, y: 0, width: 50, height: 100 },
      { x: 50, y: 0, width: 50, height: 100 }
    ]
  },
  [LayoutType.TWO_VERTICAL]: {
    type: LayoutType.TWO_VERTICAL,
    positions: [
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 50, width: 100, height: 50 }
    ]
  },
  [LayoutType.THREE_MAIN_LEFT]: {
    type: LayoutType.THREE_MAIN_LEFT,
    positions: [
      { x: 0, y: 0, width: 60, height: 100 },
      { x: 60, y: 0, width: 40, height: 50 },
      { x: 60, y: 50, width: 40, height: 50 }
    ]
  },
  [LayoutType.THREE_MAIN_RIGHT]: {
    type: LayoutType.THREE_MAIN_RIGHT,
    positions: [
      { x: 40, y: 0, width: 60, height: 100 },
      { x: 0, y: 0, width: 40, height: 50 },
      { x: 0, y: 50, width: 40, height: 50 }
    ]
  },
  [LayoutType.FOUR_GRID]: {
    type: LayoutType.FOUR_GRID,
    positions: [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 50, y: 0, width: 50, height: 50 },
      { x: 0, y: 50, width: 50, height: 50 },
      { x: 50, y: 50, width: 50, height: 50 }
    ]
  }
};

export function EnhancedOrigami({
  mediaItemIDs,
  transitionDuration = 1000,
  displayDuration = 5000
}: EnhancedOrigamiProps) {
  // Store all loaded images
  const [images, setImages] = useState<ImageInfo[]>([]);
  // Current layout type
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(LayoutType.SINGLE);
  // Photos currently displayed
  const [displayPhotos, setDisplayPhotos] = useState<DisplayPhoto[]>([]);
  // Track whether we're still loading images
  const [loading, setLoading] = useState(true);
  // Track whether a transition is in progress
  const [transitioning, setTransitioning] = useState(false);

  // Last change timestamp to enforce minimum display duration
  const lastChangeTimestamp = useRef<number>(Date.now());
  // Timer for next layout change
  const layoutChangeTimer = useRef<NodeJS.Timeout | null>(null);

  // Load images on component mount
  useEffect(() => {
    if (mediaItemIDs.length === 0) return;

    const loadImages = async () => {
      setLoading(true);

      // Randomize and limit to avoid loading too many at once
      const randomizedIDs = randomizeArray([...mediaItemIDs]).slice(0, 20);
      const loadedImages: ImageInfo[] = [];

      for (const id of randomizedIDs) {
        try {
          console.log(`Fetching media item: ${id}`);
          const mediaItem = await fetchMediaItem(id);

          if (!mediaItem.baseUrl) {
            console.error('Media item has no baseUrl:', mediaItem);
            continue;
          }

          // Add size parameter to URL for better quality
          // Some URLs from Google Photos API already include parameters
          const url = mediaItem.baseUrl + (mediaItem.baseUrl.includes('?') ? '&' : '?') + 'w=2000';
          console.log('Image URL:', url);

          const width = parseInt(mediaItem.mediaMetadata.width);
          const height = parseInt(mediaItem.mediaMetadata.height);

          // Create image info
          const imageInfo: ImageInfo = {
            id,
            url,
            width,
            height,
            aspectRatio: width / height
          };

          // Preload the image
          const img = new Image();
          img.src = url;

          // Wait for image to load
          await new Promise<void>((resolve) => {
            img.onload = () => {
              console.log(`Image loaded: ${url}`);
              resolve();
            };
            img.onerror = (err) => {
              console.error(`Failed to load image: ${url}`, err);
              resolve();
            };
          });

          loadedImages.push(imageInfo);

          // Update state incrementally so we can start showing images quickly
          if (loadedImages.length % 3 === 0) {
            setImages(prev => [...prev, ...loadedImages.slice(-3)]);
          }
        } catch (error) {
          console.error(`Error loading image ${id}:`, error);
        }
      }

      // Ensure any remaining images are added to state
      setImages(prev => {
        const newImages = [...prev];
        for (const img of loadedImages) {
          if (!newImages.some(existing => existing.id === img.id)) {
            newImages.push(img);
          }
        }
        return newImages;
      });

      setLoading(false);
      console.log(`Loaded ${loadedImages.length} images`);
    };

    loadImages();
  }, [mediaItemIDs]);

  // When images are loaded, start the slideshow
  useEffect(() => {
    if (images.length > 0 && !transitioning && displayPhotos.length === 0) {
      console.log('Images available - initializing first layout');
      updateLayout();
    }
  }, [images, transitioning, displayPhotos.length]);

  // Select a layout that fits our available images
  const selectLayout = (availableImages: ImageInfo[]): LayoutType => {
    // Filter layouts that can be filled with available images
    const possibleLayouts = Object.values(layouts)
      .filter(layout => layout.positions.length <= availableImages.length)
      .map(layout => layout.type);

    if (possibleLayouts.length === 0) {
      return LayoutType.SINGLE; // Fallback
    }

    // Select a random layout from possible options
    return possibleLayouts[Math.floor(Math.random() * possibleLayouts.length)];
  };

  // Update the layout and photos
  const updateLayout = () => {
    if (images.length === 0) {
      console.log('No images available yet');
      return;
    }

    // Enforce minimum display duration
    const now = Date.now();
    if (now - lastChangeTimestamp.current < displayDuration && displayPhotos.length > 0) {
      console.log('Too soon for layout change');
      return;
    }

    console.log('Updating layout');
    lastChangeTimestamp.current = now;
    setTransitioning(true);

    // Choose whether to keep some photos or replace all
    const keepSomePhotos = displayPhotos.length > 0 && Math.random() > 0.5;
    console.log(`Keep some photos: ${keepSomePhotos}`);

    // Create a copy of images that we can modify
    const availableImages = [...images];
    let photosToKeep: DisplayPhoto[] = [];

    if (keepSomePhotos && displayPhotos.length > 0) {
      // Keep one random photo
      const photoToKeep = displayPhotos[Math.floor(Math.random() * displayPhotos.length)];
      photosToKeep = [{ ...photoToKeep, entering: false, exiting: false }];

      // Remove kept image from available images
      const index = availableImages.findIndex(img => img.id === photoToKeep.imageInfo.id);
      if (index !== -1) {
        availableImages.splice(index, 1);
      }
    }

    // Mark all other current photos as exiting
    const exitingPhotos = displayPhotos
      .filter(p => !photosToKeep.some(keep => keep.imageInfo.id === p.imageInfo.id))
      .map(p => ({ ...p, exiting: true, entering: false }));

    // Choose new layout
    const newLayoutType = selectLayout(availableImages);
    const newLayout = layouts[newLayoutType];
    console.log(`Selected layout: ${newLayoutType} with ${newLayout.positions.length} positions`);

    // Calculate how many new photos we need
    const newPhotosNeeded = newLayout.positions.length - photosToKeep.length;
    console.log(`Need ${newPhotosNeeded} new photos`);

    // Prepare layout positions
    const availablePositions = [...newLayout.positions];

    // Remove positions already used by kept photos
    if (photosToKeep.length > 0) {
      for (const kept of photosToKeep) {
        // Find the closest position to where the kept photo is now
        let bestPositionIndex = 0;
        let minDistance = Number.MAX_VALUE;

        for (let i = 0; i < availablePositions.length; i++) {
          const pos = availablePositions[i];
          const distance =
            Math.abs(pos.x - kept.position.x) +
            Math.abs(pos.y - kept.position.y);

          if (distance < minDistance) {
            minDistance = distance;
            bestPositionIndex = i;
          }
        }

        // Update the kept photo's position
        kept.position = availablePositions[bestPositionIndex];

        // Remove this position
        availablePositions.splice(bestPositionIndex, 1);
      }
    }

    // Get new photos and assign positions
    const newPhotos: DisplayPhoto[] = [];
    for (let i = 0; i < newPhotosNeeded && i < availableImages.length; i++) {
      if (availablePositions.length === 0) break;

      // Get position and image
      const position = availablePositions[i % availablePositions.length];
      const imageInfo = availableImages[i];

      // Create new display photo
      newPhotos.push({
        imageInfo,
        position,
        entering: true,
        exiting: false,
        zIndex: 10 + i
      });
    }

    // Combine all photos
    const allPhotos = [...exitingPhotos, ...photosToKeep, ...newPhotos];
    console.log(`Total photos for display: ${allPhotos.length}`);

    // Update state
    setDisplayPhotos(allPhotos);
    setCurrentLayout(newLayoutType);

    // Debug URLs
    console.log('Photos being displayed:');
    allPhotos.forEach((photo, i) => {
      console.log(`Photo ${i}: ${photo.imageInfo.id}`, photo.imageInfo.url);
    });

    // Clear any existing timer
    if (layoutChangeTimer.current) {
      clearTimeout(layoutChangeTimer.current);
    }

    // Schedule cleanup of exiting photos
    setTimeout(() => {
      console.log('Removing exiting photos');
      setDisplayPhotos(prev => prev.filter(p => !p.exiting));
      setTransitioning(false);
    }, transitionDuration);

    // Schedule next layout change
    const nextChangeDelay = displayDuration + Math.random() * 1000;
    console.log(`Next layout change in ${nextChangeDelay}ms`);

    layoutChangeTimer.current = setTimeout(() => {
      console.log('Time for next layout change');
      updateLayout();
    }, nextChangeDelay);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layoutChangeTimer.current) {
        clearTimeout(layoutChangeTimer.current);
      }
    };
  }, []);

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#000" }}>
      {/* Debug info overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: 2,
          borderRadius: 1,
          maxWidth: '300px',
          fontSize: '12px'
        }}
      >
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {`Images: ${images.length}
Display: ${displayPhotos.length}
Layout: ${currentLayout}
Loading: ${loading ? 'Yes' : 'No'}
Transitioning: ${transitioning ? 'Yes' : 'No'}`}
        </pre>
      </Box>

      {/* Display photos */}
      {displayPhotos.map((photo, index) => (
        <Box
          key={`${photo.imageInfo.id}-${index}`}
          className={`origami-photo ${photo.entering ? 'entering' : ''} ${photo.exiting ? 'exiting' : ''}`}
          sx={{
            position: "absolute",
            left: `${photo.position.x}%`,
            top: `${photo.position.y}%`,
            width: `${photo.position.width}%`,
            height: `${photo.position.height}%`,
            zIndex: photo.zIndex,
            padding: '4px',
            boxSizing: 'border-box',
            transition: `all ${transitionDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
          >
            {/* The actual image */}
            <Box
              sx={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${photo.imageInfo.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                // For debug: add a colored border if URL seems valid
                border: photo.imageInfo.url?.length > 20 ? '1px solid rgba(0,255,0,0.3)' : '1px solid red',
              }}
            />

            {/* Debug label */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '2px 5px',
                fontSize: '10px',
                borderRadius: '0 0 4px 0'
              }}
            >
              {photo.entering ? 'In' : photo.exiting ? 'Out' : 'Stable'}
            </Box>
          </Box>
        </Box>
      ))}

      {/* Loading indicator */}
      {loading && displayPhotos.length === 0 && (
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
          Loading photos...
        </Box>
      )}
    </Box>
  );
}
