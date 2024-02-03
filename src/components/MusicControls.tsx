import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import IconButton from '@mui/material/IconButton';
//import Stack from '@mui/material/Stack';
import SkipPreviousRounded from '@mui/icons-material/SkipPreviousRounded';
import SkipNextRounded from '@mui/icons-material/SkipNextRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
//import VolumeUpRounded from '@mui/icons-material/VolumeUpRounded';
//import VolumeDownRounded from '@mui/icons-material/VolumeDownRounded';
import { Paper } from '@mui/material';

const CoverImage = styled('div')({
  width: 100,
  height: 100,
  objectFit: 'cover',
  overflow: 'hidden',
  flexShrink: 0,
  borderRadius: 3,
  backgroundColor: 'rgba(0,0,0,0.08)',
  '& > img': {
    width: '100%',
  },
});

const TinyText = styled(Typography)({
  fontSize: '0.65rem',
  opacity: 0.38,
  fontWeight: 500,
  letterSpacing: 0.2,
});

export default function MediaControls({
  title, artist, albumTitle, albumCoverUrl,
  playing, togglePlay,
  canSkipPrevious, canSkipNext, skipNext, skipPrevious,
  duration, position, setPosition
}: Props) {
  const theme = useTheme();
  
  function formatDuration(value: number) {
    const minute = Math.floor(value / 60);
    const secondLeft = Math.floor(value - minute * 60);
    return `${minute}:${secondLeft < 10 ? `0${secondLeft}` : secondLeft}`;
  }
  
  // const lightIconColor =
  //   theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  return (
    <Paper sx={{padding: 2}}>
      <Box sx={{display: 'flex', alignItems: 'center'}}>
        <CoverImage>
          <img
            alt="can't win - Chilling Sunday"
            src={albumCoverUrl}
          />
        </CoverImage>
        <Box sx={{ml: 1.5, minWidth: 0}}>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {artist}
          </Typography>
          <Typography noWrap>
            <b>{title}</b>
          </Typography>
          <Typography noWrap letterSpacing={-0.25}>
            {albumTitle}
          </Typography>
        </Box>
      </Box>
      <Slider
        aria-label="time-indicator"
        size="small"
        value={position}
        min={0}
        step={1}
        max={duration}
        onChange={(_, value) => setPosition(value as number)}
        sx={{
          color: theme.palette.mode === 'dark' ? '#fff' : '#888',
          height: 4,
          '& .MuiSlider-thumb': {
            width: 8,
            height: 8,
            transition: '0.2s ease-in-out',
            // '&::before': {
            //   boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
            // },
            '&:hover, &.Mui-focusVisible': {
              boxShadow: `0px 0px 0px 6px ${
                theme.palette.mode === 'dark'
                  ? 'rgb(255 255 255 / 16%)'
                  : 'rgb(0 0 0 / 16%)'
              }`,
            },
            '&.Mui-active': {
              width: 20,
              height: 20,
            },
          },
          '& .MuiSlider-rail': {
            opacity: 0.16,
          },
        }}
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: -2,
        }}
      >
        <TinyText>{formatDuration(position)}</TinyText>
        <TinyText>-{formatDuration(duration - position)}</TinyText>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mt: -1,
        }}
      >
        <IconButton aria-label="previous song" disabled={!canSkipPrevious} onClick={skipPrevious}>
          <SkipPreviousRounded fontSize="medium"/>
        </IconButton>
        <IconButton
          aria-label={playing ? 'pause' : 'play'}
          onClick={togglePlay}
        >
          {playing ? (
            <PauseRounded fontSize="large"/>
          ) : (
            <PlayArrowRounded fontSize="large"/>
          )}
        </IconButton>
        <IconButton aria-label="next song" disabled={!canSkipNext} onClick={skipNext}>
          <SkipNextRounded fontSize="medium"/>
        </IconButton>
      </Box>
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
    </Paper>
  );
}

interface Props {
  title: string,
  artist: string,
  albumTitle: string;
  albumCoverUrl: string,
  skipPrevious: () => void,
  canSkipPrevious: boolean,
  skipNext: () => void,
  canSkipNext: boolean,
  togglePlay: () => void,
  markFavorite: () => void,
  playing: boolean,
  position: number,
  duration: number,
  setPosition: (value: number) => void,
}
