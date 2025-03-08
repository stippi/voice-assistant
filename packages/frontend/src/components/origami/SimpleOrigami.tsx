import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { fetchMediaItem } from "../../integrations/google";
import { randomizeArray } from "../../utils/randomizeArray";

interface SimpleOrigamiProps {
  mediaItemIDs: string[];
}

// Simple layout with fixed positions
const layouts = [
  // Single photo
  [{ x: 0, y: 0, width: 100, height: 100 }],
  
  // Two photos horizontal
  [
    { x: 0, y: 0, width: 50, height: 100 },
    { x: 50, y: 0, width: 50, height: 100 }
  ],
  
  // Two photos vertical
  [
    { x: 0, y: 0, width: 100, height: 50 },
    { x: 0, y: 50, width: 100, height: 50 }
  ],
  
  // Three photos - big on left
  [
    { x: 0, y: 0, width: 60, height: 100 },
    { x: 60, y: 0, width: 40, height: 50 },
    { x: 60, y: 50, width: 40, height: 50 }
  ]
];

export function SimpleOrigami({ mediaItemIDs }: SimpleOrigamiProps) {
  const [images, setImages] = useState<Array<{ id: string, url: string }>>([]);
  const [currentLayout, setCurrentLayout] = useState<number>(0);
  const [displayedImages, setDisplayedImages] = useState<Array<{ id: string, url: string, position: { x: number, y: number, width: number, height: number } }>>([]);

  // On mount, load the first few images
  useEffect(() => {
    const randomizedIDs = randomizeArray([...mediaItemIDs]);
    
    // Load first 10 images
    const loadInitialImages = async () => {
      const loadedImages = [];
      
      for (let i = 0; i < Math.min(10, randomizedIDs.length); i++) {
        try {
          const id = randomizedIDs[i];
          const mediaItem = await fetchMediaItem(id);
          
          if (mediaItem && mediaItem.baseUrl) {
            // Add size parameter to URL for better quality
            const url = mediaItem.baseUrl + (mediaItem.baseUrl.includes('?') ? '&' : '?') + 'w=1600';
            loadedImages.push({ id, url });
          }
        } catch (error) {
          console.error("Error loading image:", error);
        }
      }
      
      console.log(`Loaded ${loadedImages.length} initial images`);
      setImages(loadedImages);
    };
    
    loadInitialImages();
  }, [mediaItemIDs]);

  // When images change, update the displayed layout
  useEffect(() => {
    if (images.length === 0) return;
    
    // Pick a random layout that fits our available images
    const availableLayouts = layouts.filter(layout => layout.length <= images.length);
    if (availableLayouts.length === 0) return;
    
    const newLayoutIndex = Math.floor(Math.random() * availableLayouts.length);
    const newLayout = availableLayouts[newLayoutIndex];
    
    console.log(`Setting layout ${newLayoutIndex} with ${newLayout.length} positions`);
    
    // Assign images to layout positions
    const displayImages = [];
    for (let i = 0; i < newLayout.length; i++) {
      if (i < images.length) {
        displayImages.push({
          id: images[i].id,
          url: images[i].url,
          position: newLayout[i]
        });
      }
    }
    
    setCurrentLayout(newLayoutIndex);
    setDisplayedImages(displayImages);
    
    // Schedule next layout change
    const nextChangeTimeout = setTimeout(() => {
      const nextImages = [...images];
      // Rotate images - move first few to end
      const rotateCount = Math.min(newLayout.length, images.length);
      for (let i = 0; i < rotateCount; i++) {
        nextImages.push(nextImages.shift()!);
      }
      setImages(nextImages);
    }, 5000);
    
    return () => clearTimeout(nextChangeTimeout);
  }, [images]);

  // Debug display info
  const debugInfo = {
    totalImages: images.length,
    displayedImages: displayedImages.length,
    layout: currentLayout
  };

  return (
    <Box sx={{ 
      position: "relative", 
      width: "100%", 
      height: "100%", 
      overflow: "hidden",
      backgroundColor: "#000"
    }}>
      {/* Debug overlay */}
      <Box sx={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 2,
        borderRadius: 1
      }}>
        <pre>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </Box>
      
      {/* Display photos */}
      {displayedImages.map((image, index) => (
        <Box
          key={`${image.id}-${index}`}
          sx={{
            position: "absolute",
            left: `${image.position.x}%`,
            top: `${image.position.y}%`,
            width: `${image.position.width}%`,
            height: `${image.position.height}%`,
            padding: "6px",
            transition: "all 1s ease-in-out",
            boxSizing: "border-box"
          }}
        >
          <Box
            sx={{
              width: "100%",
              height: "100%",
              backgroundImage: `url(${image.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              borderRadius: "4px"
            }}
          />
        </Box>
      ))}
      
      {/* Fallback if no images */}
      {displayedImages.length === 0 && (
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
