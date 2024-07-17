import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import InfoIcon from "@mui/icons-material/Info";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { PerformanceData } from "../services/PerformanceTrackingService";

// Custom styled tooltip
const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "#f5f5f9",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 320,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
    padding: theme.spacing(2),
  },
}));

// Colors for different phases
const phaseColors = {
  transcription: "#FFD700",
  firstContent: "#FF4500",
  streaming: "#32CD32",
  toolExecution: "#8A2BE2",
  spokenResponse: "#1E90FF",
};

interface PerformanceTooltipProps {
  fetchPerformanceData: () => Promise<PerformanceData>;
}

type Metric = {
  phase: string;
  duration: number;
  color: string;
};

const PerformanceTooltip: React.FC<PerformanceTooltipProps> = ({ fetchPerformanceData }) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleTooltipOpen = async () => {
    if (!hasLoaded && !isLoading) {
      setIsLoading(true);
      try {
        const data = await fetchPerformanceData();
        const calculatedMetrics: Metric[] = [];
        if (data) {
          console.log("Performance data:", data);
          if (data["transcription-finished"] && data["transcription-started"]) {
            calculatedMetrics.push({
              phase: "Time to Transcription",
              duration: data["transcription-finished"] - data["transcription-started"],
              color: phaseColors.transcription,
            });
          }
          if (data["first-content-received"] && data["streaming-started"]) {
            calculatedMetrics.push({
              phase: "Time to First Token",
              duration: data["first-content-received"] - data["streaming-started"],
              color: phaseColors.firstContent,
            });
          }
          if (data["streaming-finished"] && data["first-content-received"]) {
            calculatedMetrics.push({
              phase: "Streaming Duration",
              duration: data["streaming-finished"] - data["first-content-received"],
              color: phaseColors.streaming,
            });
          }
          if (data["tool-execution-finished"] && data["tool-execution-started"]) {
            calculatedMetrics.push({
              phase: "Tool Execution",
              duration: data["tool-execution-finished"] - data["tool-execution-started"],
              color: phaseColors.toolExecution,
            });
          }
          if (data["spoken-response-finished"] && data["spoken-response-started"]) {
            calculatedMetrics.push({
              phase: "Speech Synthesis",
              duration: data["spoken-response-finished"] - data["spoken-response-started"],
              color: phaseColors.spokenResponse,
            });
          }
        }
        setMetrics(calculatedMetrics);
        setTotalDuration(calculatedMetrics.reduce((sum, metric) => sum + metric.duration, 0));
        setHasLoaded(true);
      } catch (error) {
        console.error("Error fetching performance data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const TimelineBar = styled(Box)(({ theme }) => ({
    display: "flex",
    width: "100%",
    height: theme.spacing(2),
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    overflow: "hidden",
  }));

  const TimelineSegment = styled(Box)<{ color: string; width: string }>(({ color, width }) => ({
    backgroundColor: color,
    width: width,
  }));

  const MetricItem = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(0.5),
  }));

  const ColorBox = styled(Box)<{ color: string }>(({ theme, color }) => ({
    width: theme.spacing(1.5),
    height: theme.spacing(1.5),
    marginRight: theme.spacing(1),
    backgroundColor: color,
  }));

  const tooltipContent = isLoading ? (
    <Box display="flex" justifyContent="center" alignItems="center" height={100}>
      <CircularProgress size={24} />
    </Box>
  ) : (
    <React.Fragment>
      <Typography variant="subtitle1" component="h3" gutterBottom>
        Performance Metrics
      </Typography>
      <TimelineBar>
        {metrics.map((metric, index) => (
          <TimelineSegment key={index} color={metric.color} width={`${(metric.duration / totalDuration) * 100}%`} />
        ))}
      </TimelineBar>
      <Box component="ul" sx={{ listStyle: "none", padding: 0, margin: 0 }}>
        {metrics.map((metric, index) => (
          <MetricItem key={index} component="li">
            <ColorBox color={metric.color} />
            <Typography variant="body2">
              {metric.phase}: {(metric.duration / 1000).toFixed(2)}s
            </Typography>
          </MetricItem>
        ))}
      </Box>
    </React.Fragment>
  );

  return (
    <HtmlTooltip title={tooltipContent} onOpen={handleTooltipOpen}>
      <IconButton size="small">
        <InfoIcon fontSize="inherit" />
      </IconButton>
    </HtmlTooltip>
  );
};

export default PerformanceTooltip;
