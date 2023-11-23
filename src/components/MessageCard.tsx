import React from "react";
import './MessageCard.css';

import {Rings} from "react-loader-spinner";
import PersonIcon from '@mui/icons-material/Person';
import AssistantIcon from '@mui/icons-material/Assistant'
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {Message} from "../model/message.ts";

function messageContent(message: Message) {
  if (message.role === "assistant" && message.content === "") {
    return (<Rings
      height="30"
      width="30"
      color="rgb(58 90 124)"
      radius="6"
      wrapperStyle={{}}
      wrapperClass=""
      visible={true}
      ariaLabel="rings-loading"
    />)
  }
  if (message.role === "assistant" && message.tool_calls) {
    return (<>
      {message.tool_calls.filter(tool_call => tool_call.function.name === "show_image")
        .map((tool_call, index) => {
          const args: { image: string } = JSON.parse(tool_call.function.arguments);
          console.log(args)
          return (
            <div key={index} dangerouslySetInnerHTML={{ __html: args.image }}/>
          )
        })}
    </>)
  }
  return (<Markdown
    children={message.content}
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
  />)
}

export const MessageCard = React.forwardRef(({ className, message }: Props, ref: React.ForwardedRef<HTMLDivElement>) => {
  // const user = "😀";
  // const assistant = "🤖";
  return (
    <div className={className} ref={ref}>
      {message.role === "user" ?
        <PersonIcon className="role" color="disabled"/>
        :
        <AssistantIcon className="role" color="disabled"/>
      }
      <div className="content">
        {messageContent(message)}
      </div>
    </div>
  );
});

interface Props {
  message: Message
  className: string
  ref?: React.Ref<HTMLDivElement>
}
