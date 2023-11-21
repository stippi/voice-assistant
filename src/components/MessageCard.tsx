import React from "react";
import './MessageCard.css';

import {Rings} from "react-loader-spinner";
import PersonIcon from '@mui/icons-material/Person';
import AssistantIcon from '@mui/icons-material/Assistant'
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const MessageCard = React.forwardRef(({ className, role, content }: Props, ref: React.ForwardedRef<HTMLDivElement>) => {
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
          : <Markdown
              children={content}
              components={{
                code(props) {
                  const {children, className, ...rest} = props
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      children={String(children).replace(/\n$/, '')}
                      language={match[1]}
                      style={oneLight}
                      customStyle={{fontSize: "15px"}}
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
});

interface Props {
  role: "user" | "assistant"
  content: string
  className: string
  ref?: React.Ref<HTMLDivElement>
}
