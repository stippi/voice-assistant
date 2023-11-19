import React from "react";
import './MessageCard.css';

import {Rings} from "react-loader-spinner";
import PersonIcon from '@mui/icons-material/Person';
import AssistantIcon from '@mui/icons-material/Assistant'
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { nnfx } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export function MessageCard({role, content, className, ref}: Props) {
  // const user = "😀";
  // const assistant = "🤖";
  return (
    <div className={className} ref={ref}>
      {role == "user" ?
        <PersonIcon className="role" color="disabled"/>
        :
        <AssistantIcon className="role" color="disabled"/>
      }
      <div className="content">
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
          //: <div dangerouslySetInnerHTML={toInnerHtml(content)}/>
          : <Markdown
              children={content}
              components={{
                code(props) {
                  const {children, className, node, ...rest} = props
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      children={String(children).replace(/\n$/, '')}
                      language={match[1]}
                      style={oneLight}
                    />
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  )
                }
              }}
            />
        }
      </div>
    </div>
  );
}

interface Props {
  role: "user" | "assistant"
  content: string
  className: string
  ref?: React.Ref<HTMLDivElement>
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

function replaceBlocks(str) {
  let opening = true;
  return str.replace(/```/g, () => {
    if (opening) {
      opening = false;
      return '<pre><code>';
    } else {
      opening = true;
      return '</code></pre>';
    }
  });
}

function removeHTMLTags(str) {
  return str.replace(/<.*?>/g, "");
}

function wrapParagraphs(str) {
  const lines = str.split('\n');
  let html = '';
  let inList = false;
  
  for (const line of lines) {
    const listMatch = line.match(/^(\d+)\. (.*)/);
    
    if (listMatch) {
      if (!inList) {
        html += '<ol style="list-style: none; padding-left: 0;">';
        inList = true;
      }
      html += `<li><span class="list-number">${listMatch[1]}.</span> ${listMatch[2]}</li>`;
    } else {
      if (inList) {
        html += '</ol>';
        inList = false;
      }
      html += line.length > 0 ? `<p>${line}</p>` : '';
    }
  }
  
  if (inList) {
    html += '</ol>';
  }
  
  return html;
}

function toInnerHtml(content: string) {
  content = removeHTMLTags(content);
  content = replaceDoubleAsterisks(content);
  content = replaceAsterisks(content);
  content = replaceBlocks(content);
  content = wrapParagraphs(content);
  return {__html: content}
}
