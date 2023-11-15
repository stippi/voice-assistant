import React from "react";
import {Rings} from "react-loader-spinner";

export function MessageCard({role, content}: Props) {
  const icon = role == "user" ? "person-placeholder" : "sys-monitor"
  const bgClass = role == "user" ? "bg-container" : ""
  return (
    <div className={`w-full ${bgClass} flex border-b border-border-header py-4`}>
      <div className={`icon-${icon} pl-28 chat-source`}/>
      <div className="ml-6 pr-28">
        {role == "agent" && !content ?
          <Rings
            height="30"
            width="30"
            color="rgb(58 90 124)"
            radius="6"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
            ariaLabel="rings-loading"
          />
          : content}
      </div>
    </div>
  );
}

interface Props {
  role: "user" | "assistant"
  content: string
}
