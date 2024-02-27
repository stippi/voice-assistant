import React, {useState, useEffect} from "react";
import {CSSTransition, TransitionGroup} from "react-transition-group";
import {MediaItem} from "../integrations/google";
import "./RandomPhoto.css";
import {Box} from "@mui/material";
import {randomizeArray} from "../utils/randomizeArray.ts";
import useWindowFocus from "../hooks/useWindowFocus.tsx";

export function RandomPhoto({ mediaItems, hovered, children }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [randomizedMediaItems, setRandomizedMediaItems] = useState(mediaItems);
  const {documentVisible} = useWindowFocus();
  
  // Whenever index == 0, randomize the media items
  useEffect(() => {
    if (currentIndex === 0) {
      setRandomizedMediaItems(randomizeArray(mediaItems));
    }
  }, [mediaItems, currentIndex]);
  
  // Increment the index at a regular interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (documentVisible) {
        setCurrentIndex(currentIndex => (currentIndex + 1) % randomizedMediaItems.length);
      }
    }, 20000);
    
    return () => clearInterval(interval);
  }, [documentVisible, randomizedMediaItems]);
  
  const currentPhoto = randomizedMediaItems[currentIndex];
  
  return (
    <Box className="container">
      {currentPhoto && (
        <img
          src={currentPhoto.baseUrl}
          width={currentPhoto.mediaMetadata.width}
          height={currentPhoto.mediaMetadata.height}
          alt="Placeholder"
          className="placeholder"
        />
      )}
      <TransitionGroup>
        {currentPhoto && (
          <CSSTransition key={currentPhoto.id} timeout={1000} classNames="fade">
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "4px",
                backgroundImage: `url("${currentPhoto.baseUrl}")`,
                backgroundSize: "cover",
                cursor: "pointer",
                
                "&:after": {
                  content: '""',
                  position: "absolute",
                  borderRadius: "4px",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100px",
                  opacity: hovered ? 1 : 0,
                  mask: "linear-gradient(black 40%, transparent)",
                  background: "linear-gradient(rgba(255, 255, 255, 0.5) 30%, rgba(255, 255, 255, 0))",
                  backdropFilter: "blur(4px)",
                  transition: "0.2s",
                },
              }}
              onClick={() => {
                window.open(currentPhoto.productUrl, "_blank");
              }}
            />
          </CSSTransition>
        )}
      </TransitionGroup>
      {children}
    </Box>
  );
}

interface Props {
  mediaItems: MediaItem[];
  hovered?: boolean;
  children?: React.ReactNode;
}