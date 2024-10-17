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
  const { playerState, resumePlayback, pausePlayback, skipNext, skipPrevious, seek } = useSpotifyContext();
  if (idle && !playerState.trackId) {
    return <> </>;
  }
  const padding = idle ? 2.5 : 2;
  return (
    <CollapsibleList
      header={
        playerState.trackId && (
          <Box
            sx={{
              paddingLeft: padding,
              paddingRight: padding,
              paddingTop: padding,
              fontSize: idle ? "1.4rem" : "1rem",
            }}
          >
            <CurrentSong
              title={playerState.name}
              artist={playerState.artists.join(", ")}
              albumTitle={playerState.albumName}
              albumCoverUrl={playerState.coverImageUrl}
              scale={idle ? 1.6 : 1}
            />
            <PositionControls
              position={playerState.position}
              duration={playerState.duration}
              setPosition={async (value: number) => {
                await seek(value * 1000);
              }}
              scale={idle ? 1.6 : 1}
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
            skipPrevious={skipPrevious}
            skipNext={skipNext}
            canSkipPrevious={playerState.canSkipPrevious}
            canSkipNext={playerState.canSkipNext}
            togglePlay={async () => {
              if (playerState.paused) {
                await resumePlayback();
              } else {
                await pausePlayback();
              }
            }}
            playing={!playerState.paused}
            scale={idle ? 1.4 : 1}
          />
        )
      }
      secondaryTitle={playerState.trackId ? "Show playlist" : "No music streaming"}
      settingsKey="showPlaylist"
      disableExpand={!playerState.trackId || idle}
    >
      {playerState.trackId && <Divider />}
      <MusicPlaylist />
    </CollapsibleList>
  );
}
