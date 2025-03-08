import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { SimpleOrigami } from "../components/origami/SimpleOrigami";
import { fetchFavoritePhotos } from "../integrations/google";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link } from "react-router-dom";

export default function OrigamiPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaItemIDs, setMediaItemIDs] = useState<string[]>([]);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true);
        const photos = await fetchFavoritePhotos(50);
        console.log('Loaded photos:', photos.length, photos);
        setMediaItemIDs(photos.map(photo => photo.id));
        setLoading(false);
      } catch (err) {
        console.error("Error loading photos:", err);
        setError("Failed to load photos. Please check your Google login status.");
        setLoading(false);
      }
    };

    loadPhotos();
  }, []);

  return (
    <Box sx={{ 
      width: "100%", 
      height: "100vh", 
      position: "relative",
      overflow: "hidden",
      backgroundColor: "#000"
    }}>
      {/* Back button */}
      <Box sx={{ 
        position: "absolute", 
        top: 16, 
        left: 16, 
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        color: "white", 
        opacity: 0.7,
        transition: "opacity 0.2s",
        "&:hover": { opacity: 1 },
        backdropFilter: "blur(5px)",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        padding: "8px 12px",
        borderRadius: "20px"
      }}>
        <Link to="/" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center" }}>
          <ArrowBackIcon sx={{ marginRight: 1 }} />
          <Typography variant="body2">Back to Dashboard</Typography>
        </Link>
      </Box>

      {loading && (
        <Box sx={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100%",
          flexDirection: "column",
          color: "white"
        }}>
          <CircularProgress color="inherit" sx={{ marginBottom: 2 }} />
          <Typography>Loading your photos...</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100%",
          flexDirection: "column",
          color: "white",
          padding: 3,
          textAlign: "center"
        }}>
          <Typography variant="h6" gutterBottom>Error</Typography>
          <Typography>{error}</Typography>
          <Typography variant="body2" sx={{ marginTop: 2 }}>
            Please make sure you are logged in to your Google account and have given permission to access photos.
          </Typography>
        </Box>
      )}

      {!loading && !error && mediaItemIDs.length > 0 && (
        <>
          <Box sx={{ position: 'absolute', top: 60, right: 16, zIndex: 100, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 1, borderRadius: 1 }}>
            <Typography variant="body2">Loaded {mediaItemIDs.length} photos</Typography>
          </Box>
          <SimpleOrigami mediaItemIDs={mediaItemIDs} />
        </>
      )}

      {!loading && !error && mediaItemIDs.length === 0 && (
        <Box sx={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100%",
          flexDirection: "column",
          color: "white",
          padding: 3,
          textAlign: "center"
        }}>
          <Typography variant="h6" gutterBottom>No Photos Found</Typography>
          <Typography>
            No favorite photos were found in your Google Photos library.
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 2 }}>
            Please add some photos to your favorites and try again.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
