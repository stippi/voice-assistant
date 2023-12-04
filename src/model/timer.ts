export type Timer = {
  id: string;
  title: string;
  type: "countdown" | "alarm";
  time: string;
  ringing?: boolean;
}
