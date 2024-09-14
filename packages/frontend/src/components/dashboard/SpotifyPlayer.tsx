import HeadphonesIcon from "@mui/icons-material/Headphones";
import { Box, Divider } from "@mui/material";
import { CollapsibleList } from "./DashboardItem";
import { CurrentSong, PlaybackControls, PositionControls } from "./MusicControls";
import { MusicPlaylist } from "./MusicPlaylist";
import { useSpotifyContext } from "../../hooks";

interface Props {
  idle: boolean;
}

export function SpotifyPlayer({ idle }: Props) {
  const { player, playerState, deviceId, play, pausePlayback, skipNext, skipPrevious } = useSpotifyContext();
  if (idle && !playerState.trackId) {
    return <> </>;
  }
  return (
    <CollapsibleList
      header={
        playerState.trackId && (
          <Box sx={{ paddingLeft: 2, paddingRight: 2, paddingTop: 2 }}>
            <CurrentSong
              title={playerState.name}
              artist={playerState.artists.join(", ")}
              albumTitle={playerState.albumName}
              albumCoverUrl={playerState.coverImageUrl}
            />
            <PositionControls
              position={playerState.position}
              duration={playerState.duration}
              setPosition={async (value: number) => {
                if (player) {
                  await player.seek(value * 1000);
                }
              }}
            />
          </Box>
        )
      }
      icon={playerState.trackId ? <div /> : <HeadphonesIcon style={{ color: "#00ce41", fontSize: "1.5rem" }} />}
      title={
        !playerState.trackId ? (
          "Music"
        ) : (
          <PlaybackControls
            skipPrevious={async () => skipPrevious(deviceId)}
            skipNext={async () => skipNext(deviceId)}
            canSkipPrevious={playerState.canSkipPrevious}
            canSkipNext={playerState.canSkipNext}
            togglePlay={async () => {
              if (playerState.paused) {
                await play(deviceId, []);
              } else {
                await pausePlayback(deviceId);
              }
            }}
            playing={!playerState.paused}
          />
        )
      }
      secondaryTitle={playerState.trackId ? "Show playlist" : "No music is currently streaming"}
      settingsKey="showPlaylist"
      disableExpand={!playerState.trackId}
    >
      {playerState.trackId && <Divider />}
      <MusicPlaylist />
    </CollapsibleList>
  );
}
