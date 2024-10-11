import React, { useEffect, useRef, useState } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { Box, IconButton, Slider, Tooltip } from "@mui/material";
import Typography, { TypographyProps } from "@mui/material/Typography";
//import Stack from '@mui/material/Stack';
import SkipPreviousRounded from "@mui/icons-material/SkipPreviousRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import PauseRounded from "@mui/icons-material/PauseRounded";
//import VolumeUpRounded from '@mui/icons-material/VolumeUpRounded';
//import VolumeDownRounded from '@mui/icons-material/VolumeDownRounded';

interface CoverImageProps {
  scale?: number;
}

const CoverImage = styled("div")(({ scale = 1 }: CoverImageProps) => ({
  width: 100 * scale,
  height: 100 * scale,
  objectFit: "cover",
  overflow: "hidden",
  flexShrink: 0,
  borderRadius: 3 * scale,
  backgroundColor: "rgba(0,0,0,0.08)",
  "& > img": {
    width: "100%",
  },
}));

const TinyText = styled(Typography)({
  fontSize: "0.65em",
  opacity: 0.38,
  fontWeight: 500,
  letterSpacing: 0.2,
});

interface TextWithTooltipProps extends TypographyProps {
  text: string;
}

const TextWithTooltip = ({ text, ...props }: TextWithTooltipProps) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement) return;

    const updateOverflowStatus = () => {
      setIsOverflowing(textElement.offsetWidth < textElement.scrollWidth);
    };

    updateOverflowStatus();

    const resizeObserver = new ResizeObserver(updateOverflowStatus);
    resizeObserver.observe(textElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [text]);

  const renderContent = () => (
    <Typography {...props} noWrap ref={textRef}>
      {text}
    </Typography>
  );

  return isOverflowing ? (
    <Tooltip title={text} placement="top">
      {renderContent()}
    </Tooltip>
  ) : (
    renderContent()
  );
};

interface CurrentSongProps {
  title: string;
  artist: string;
  albumTitle: string;
  albumCoverUrl: string;
  scale?: number;
}

export const CurrentSong = React.memo(({ artist, title, albumTitle, albumCoverUrl, scale }: CurrentSongProps) => {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <CoverImage scale={scale}>
        <img alt="can't win - Chilling Sunday" src={albumCoverUrl} />
      </CoverImage>
      <Box sx={{ ml: 1.5 * scale, minWidth: 0 }}>
        <TextWithTooltip text={artist} variant="subtitle2" color="text.secondary" fontWeight={500} fontSize="0.8em" />
        <TextWithTooltip text={title} fontWeight={700} fontSize="1.2em" />
        <TextWithTooltip
          text={albumTitle}
          noWrap
          variant="subtitle2"
          color="text.secondary"
          letterSpacing={-0.25}
          fontSize="0.75em"
        />
      </Box>
    </Box>
  );
});

interface PositionProps {
  position: number;
  duration: number;
  setPosition: (value: number) => void;
  scale?: number;
}

export function PositionControls({ position, duration, setPosition, scale = 1 }: PositionProps) {
  const theme = useTheme();

  function formatDuration(value: number) {
    const minute = Math.floor(value / 60);
    const secondLeft = Math.floor(value - minute * 60);
    return `${minute}:${secondLeft < 10 ? `0${secondLeft}` : secondLeft}`;
  }
  return (
    <>
      <Slider
        aria-label="time-indicator"
        size="small"
        value={position}
        min={0}
        step={1}
        max={duration}
        onChange={(_, value) => setPosition(value as number)}
        sx={{
          color: theme.palette.mode === "dark" ? "#bbb" : "#888",
          height: 4 * scale,
          paddingY: 1.8 * scale,
          "& .MuiSlider-thumb": {
            width: 8 * scale,
            height: 8 * scale,
            transition: "0.2s ease-in-out",
            // '&::before': {
            //   boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
            // },
            "&:hover, &.Mui-focusVisible": {
              boxShadow: `0px 0px 0px 6px ${
                theme.palette.mode === "dark" ? "rgb(255 255 255 / 16%)" : "rgb(0 0 0 / 16%)"
              }`,
            },
            "&.Mui-active": {
              width: 20 * scale,
              height: 20 * scale,
            },
          },
          "& .MuiSlider-rail": {
            opacity: 0.16,
          },
        }}
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: -2,
          marginBottom: -0.75,
        }}
      >
        <TinyText>{formatDuration(position)}</TinyText>
        <TinyText>-{formatDuration(duration - position)}</TinyText>
      </Box>
    </>
  );
}

interface PlaybackProps {
  skipPrevious: () => void;
  canSkipPrevious: boolean;
  skipNext: () => void;
  canSkipNext: boolean;
  togglePlay: () => void;
  playing: boolean;
  fontSize?: number | string;
  fontSizeLarge?: number | string;
}

export const PlaybackControls = React.memo(
  ({
    playing,
    togglePlay,
    canSkipPrevious,
    canSkipNext,
    skipNext,
    skipPrevious,
    fontSize = "1.9em",
    fontSizeLarge = "2.2em",
  }: PlaybackProps) => {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mt: -1,
        }}
      >
        <IconButton
          aria-label="previous"
          disabled={!canSkipPrevious}
          onClick={skipPrevious}
          color="inherit"
          style={{ fontSize }}
        >
          <SkipPreviousRounded fontSize="inherit" />
        </IconButton>
        <IconButton
          aria-label={playing ? "pause" : "play"}
          onClick={togglePlay}
          color="inherit"
          style={{ fontSize: fontSizeLarge }}
        >
          {playing ? <PauseRounded fontSize="inherit" /> : <PlayArrowRounded fontSize="inherit" />}
        </IconButton>
        <IconButton aria-label="next" disabled={!canSkipNext} onClick={skipNext} color="inherit" style={{ fontSize }}>
          <SkipNextRounded fontSize="inherit" />
        </IconButton>
      </Box>
    );
  },
);

interface MusicControlsProps extends PositionProps, PlaybackProps, CurrentSongProps {
  markFavorite: () => void;
  fontSize?: number | string;
}

export function MusicControls({
  title,
  artist,
  albumTitle,
  albumCoverUrl,
  playing,
  togglePlay,
  canSkipPrevious,
  canSkipNext,
  skipNext,
  skipPrevious,
  duration,
  position,
  setPosition,
  fontSize = "1em",
}: MusicControlsProps) {
  return (
    <Box sx={{ padding: 2, fontSize }}>
      <CurrentSong title={title} artist={artist} albumTitle={albumTitle} albumCoverUrl={albumCoverUrl} />
      <PositionControls position={position} duration={duration} setPosition={setPosition} />
      {/*<Stack spacing={2} direction="row" sx={{mb: 1, px: 1}} alignItems="center">*/}
      {/*  <VolumeDownRounded htmlColor={lightIconColor}/>*/}
      {/*  <Slider*/}
      {/*    aria-label="Volume"*/}
      {/*    defaultValue={30}*/}
      {/*    sx={{*/}
      {/*      color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0,0,0,0.87)',*/}
      {/*      '& .MuiSlider-track': {*/}
      {/*        border: 'none',*/}
      {/*      },*/}
      {/*      '& .MuiSlider-thumb': {*/}
      {/*        width: 24,*/}
      {/*        height: 24,*/}
      {/*        backgroundColor: '#fff',*/}
      {/*        '&::before': {*/}
      {/*          boxShadow: '0 4px 8px rgba(0,0,0,0.4)',*/}
      {/*        },*/}
      {/*        '&:hover, &.Mui-focusVisible, &.Mui-active': {*/}
      {/*          boxShadow: 'none',*/}
      {/*        },*/}
      {/*      },*/}
      {/*    }}*/}
      {/*  />*/}
      {/*  <VolumeUpRounded htmlColor={lightIconColor}/>*/}
      {/*</Stack>*/}
      <PlaybackControls
        playing={playing}
        togglePlay={togglePlay}
        canSkipPrevious={canSkipPrevious}
        canSkipNext={canSkipNext}
        skipPrevious={skipPrevious}
        skipNext={skipNext}
      />
    </Box>
  );
}
