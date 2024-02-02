import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FavoriteIcon from '@mui/icons-material/Favorite';

export default function MediaControlCard({title, artist, albumUrl, playing, togglePlay, skipNext, skipPrevious, markFavorite}: Props) {
  const theme = useTheme();

  return (
    <Card sx={{ display: 'flex' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <CardContent sx={{ flex: '1 0 auto' }}>
          <Typography component="div" style={{
            fontSize: '18px',
            maxWidth: '130px',
            overflow: 'none',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {title}
          </Typography>
          <Typography color="text.secondary" component="div" style={{
            fontSize: '14px',
            maxWidth: '130px',
            overflow: 'none',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {artist}
          </Typography>
        </CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
          <IconButton
            aria-label="previous"
            onClick={theme.direction === 'rtl' ? skipNext : skipPrevious}
          >
            {theme.direction === 'rtl' ? <SkipNextIcon /> : <SkipPreviousIcon />}
          </IconButton>
          <IconButton
            aria-label="play/pause"
            onClick={togglePlay}
          >
            {playing ? <PauseIcon sx={{ height: 38, width: 38 }} /> : <PlayArrowIcon sx={{ height: 38, width: 38 }} />}
          </IconButton>
          <IconButton
            aria-label="next"
            onClick={theme.direction === 'rtl' ? skipPrevious : skipNext}
          >
            {theme.direction === 'rtl' ? <SkipPreviousIcon /> : <SkipNextIcon />}
          </IconButton>
          <IconButton
            style={{ fontSize: '12px' }}
            aria-label="mark as favorite"
            onClick={markFavorite}
            >
            <FavoriteIcon fontSize="inherit"/>
          </IconButton>
        </Box>
      </Box>
      {albumUrl && (
        <CardMedia
          component="img"
          sx={{ width: 151 }}
          image={albumUrl}
          alt="Album cover"
        />
      )}
    </Card>
  );
}

interface Props {
  title: string,
  artist: string,
  albumUrl: string,
  skipPrevious: () => void,
  skipNext: () => void,
  togglePlay: () => void,
  markFavorite: () => void,
  playing: boolean,
}
