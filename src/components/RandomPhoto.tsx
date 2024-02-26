import {useState, useEffect} from "react";
import {CSSTransition, TransitionGroup} from "react-transition-group";
import {MediaItem} from "../integrations/google";
import "./RandomPhoto.css";
import {Box} from "@mui/material";
import {randomizeArray} from "../utils/randomizeArray.ts";

export function RandomPhoto({ mediaItems }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [randomizedMediaItems, setRandomizedMediaItems] = useState(mediaItems);
  
  // Whenever index == 0, randomize the media items
  useEffect(() => {
    if (currentIndex === 0) {
      setRandomizedMediaItems(randomizeArray(mediaItems));
    }
  }, [mediaItems, currentIndex]);
  
  // Increment the index at a regular interval
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(currentIndex => (currentIndex + 1) % randomizedMediaItems.length);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [randomizedMediaItems]);
  
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
            <img
              src={currentPhoto.baseUrl}
              alt="Photo"
              className="photo"
              onClick={() => {
                window.open(currentPhoto.productUrl, "_blank");
              }}
            />
          </CSSTransition>
        )}
      </TransitionGroup>
    </Box>
  );
}

interface Props {
  mediaItems: MediaItem[];
}