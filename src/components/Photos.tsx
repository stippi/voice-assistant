import React, {useState, useEffect} from "react";
import {CSSTransition, TransitionGroup} from "react-transition-group";
import {fetchMediaItem, MediaItem} from "../integrations/google";
import "./Photos.css";
import {Box} from "@mui/material";
import {randomizeArray} from "../utils/randomizeArray.ts";
import useWindowFocus from "../hooks/useWindowFocus.tsx";
import useSettings from "../hooks/useSettings.tsx";
import {gridConfig} from "./dashboardGridConfig.ts";
import IconButton from "@mui/material/IconButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import {CollapsibleList, ExpandButton} from "./Dashboard.tsx";
import {PlaybackControls} from "./MusicControls.tsx";

export function Photo({ currentPhoto, hovered, children }: PhotoProps) {
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
            />
          </CSSTransition>
        )}
      </TransitionGroup>
      {children}
    </Box>
  );
}

interface PhotoProps {
  hovered?: boolean;
  children?: React.ReactNode;
  currentPhoto: MediaItem | null;
}

export function Photos({mediaItemIDs}: PhotosProps) {
  const {settings, setSettings} = useSettings();
  const isExpanded = settings.showPhotos;
  const toggleExpand = () => setSettings({...settings, showPhotos: !isExpanded});
  const [hovered, setHovered] = React.useState(false);
  
  const [playing, setPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhoto, setCurrentPhoto] = useState<MediaItem | null>(null);
  const [randomizedMediaItems, setRandomizedMediaItems] = useState(mediaItemIDs);
  const {documentVisible} = useWindowFocus();
  
  // Whenever index == 0, randomize the media items
  useEffect(() => {
    if (currentIndex === 0) {
      setRandomizedMediaItems(randomizeArray(mediaItemIDs));
    }
  }, [mediaItemIDs, currentIndex]);
  
  // Increment the index at a regular interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (documentVisible && playing && isExpanded) {
        setCurrentIndex(currentIndex => (currentIndex + 1) % randomizedMediaItems.length);
      }
    }, 20000);
    
    return () => clearInterval(interval);
  }, [documentVisible, randomizedMediaItems, playing, isExpanded]);
  
  useEffect(() => {
    const id = randomizedMediaItems[currentIndex];
    fetchMediaItem(id).then(updatedItem => {
      setCurrentPhoto(updatedItem);
    }).catch(error => {
      console.error("Error fetching media item", error);
    });
  }, [randomizedMediaItems, currentIndex, setCurrentPhoto]);
  
  return (
    <CollapsibleList
      sx={{
        '&:hover .headerItems': { opacity: 1 },
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      header={mediaItemIDs.length > 0 && isExpanded && (
        <Photo
          hovered={hovered}
          currentPhoto={currentPhoto}
        >
          <Box
            className="headerItems"
            sx={{
              color: "#222",
              opacity: 0,
              transition: 'opacity 0.3s',
              
              position: "absolute",
              left: 0,
              right: 0,
              top: "3px",
              zIndex: 10,
              
              ...gridConfig,
              
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            <IconButton
              aria-label="open photo"
              size="small"
              color="inherit"
              onClick={() => {
                if (currentPhoto) {
                  window.open(currentPhoto.productUrl, "_blank");
                }
              }}
            >
              <OpenInNewIcon fontSize="inherit" />
            </IconButton>
            <PlaybackControls
              playing={playing}
              togglePlay={() => setPlaying(!playing)}
              canSkipPrevious={true}
              canSkipNext={true}
              skipNext={() => setCurrentIndex((currentIndex + 1) % randomizedMediaItems.length)}
              skipPrevious={() => setCurrentIndex((currentIndex - 1 + randomizedMediaItems.length) % randomizedMediaItems.length)}
            />
            <IconButton
              sx={{
                paddingBlock: 0,
                paddingInline: 0,
                width: "32px",
                height: "32px",
              }}
              onClick={toggleExpand}
            >
              <ExpandButton open={isExpanded} id="expand-photos"/>
            </IconButton>
          </Box>
        </Photo>
      )}
      icon={<CameraAltIcon style={{color: "#ff5bde", fontSize: "1.5rem"}}/>}
      title="Photos"
      secondaryTitle="A gallery of your favorites"
      settingsKey="showPhotos"
      expandKey="expand-photos"
      hideList={isExpanded}
    >
    </CollapsibleList>
  );
}

interface PhotosProps {
  mediaItemIDs: string[];
}
