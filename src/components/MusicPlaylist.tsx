import React from "react";
import useSpotifyContext from "../hooks/useSpotifyContext";
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";

const PlaylistItem = React.memo(({icon, artists, title}: PlaylistItemProps) => {
  return (
    <ListItemButton
      alignItems={"flex-start"}
    >
      {icon ? (
        <ListItemIcon sx={{ fontSize: 20 }}>
          {icon}
        </ListItemIcon>
      ) : (
        <div/>
      )}
      <ListItemText
        primary={title}
        primaryTypographyProps={{
          fontSize: 15,
          fontWeight: 'medium',
          lineHeight: '20px',
          mb: '2px',
          noWrap: true,
        }}
        secondary={artists.join(', ')}
        secondaryTypographyProps={{
          fontSize: 12,
          lineHeight: '16px',
          noWrap: true,
        }}
      />
    </ListItemButton>
  );
});

interface PlaylistItemProps {
  icon?: React.ReactNode;
  artists: string[];
  title: string;
  uiLink: string;
}

export function MusicPlaylist() {
  const { playerState: { previousTracks, trackId, name, artists, uiLink, nextTracks } } = useSpotifyContext();
  
  return (
    <>
      {previousTracks.map(track => (
        <div key={track.id}>
          <PlaylistItem
            title={track.name}
            artists={track.artists}
            uiLink={track.uiLink}
          />
        </div>
      ))}
      {trackId && (
        <div key={trackId}>
          <PlaylistItem
            icon={<PlayArrowRounded />}
            title={name}
            artists={artists}
            uiLink={uiLink}
          />
        </div>
      )}
      {nextTracks.map(track => (
        <div key={track.id}>
          <PlaylistItem
            title={track.name}
            artists={track.artists}
            uiLink={track.uiLink}
          />
        </div>
      ))}
    </>
  );
}
