import React from "react";
import {Rings} from "react-loader-spinner";
import PersonIcon from '@mui/icons-material/Person';
import AssistantIcon from '@mui/icons-material/Assistant';

export function MessageCard({role, content}: Props) {
  const icon = role == "user" ? "person-placeholder" : "sys-monitor"
  const bgClass = role == "user" ? "bg-container" : ""
  return (
    <div className={`w-full ${bgClass} flex border-b border-border-header py-4`}>
      {role == "user" ? <PersonIcon color="disabled"/> : <AssistantIcon color="disabled"/>}
      <div className="ml-6 pr-28">
        {role == "assistant" && content === "" ?
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
          : <div dangerouslySetInnerHTML={toInnerHtml(content)}/>}
      </div>
    </div>
  );
}

function replaceAsterisks(str) {
  let replaceWithItalic = true;
  return str.replace(/\*/g, () => {
    if (replaceWithItalic) {
      replaceWithItalic = false;
      return '<i>';
    } else {
      replaceWithItalic = true;
      return '</i>';
    }
  });
}

function replaceDoubleAsterisks(str) {
  let replaceWithStrong = true;
  return str.replace(/\*\*/g, () => {
    if (replaceWithStrong) {
      replaceWithStrong = false;
      return '<strong>';
    } else {
      replaceWithStrong = true;
      return '</strong>';
    }
  });
}

function removeHTMLTags(str) {
  return str.replace(/<.*?>/g, "");
}

function wrapParagraphs(str) {
  // Wrap in <p> tags
  return str.replace(/(.+)(\n|$)/g, "<p>$1</p>");
}

function toInnerHtml(content: string) {
  content = removeHTMLTags(content);
  content = replaceDoubleAsterisks(content);
  content = replaceAsterisks(content);
  content = wrapParagraphs(content);
  return {__html: content}
}

interface Props {
  role: "user" | "assistant"
  content: string
}
