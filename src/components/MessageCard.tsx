import React from "react";
import './MessageCard.css';

import {Discuss} from "react-loader-spinner";
//import PersonIcon from '@mui/icons-material/Person';
//import AssistantIcon from '@mui/icons-material/Assistant'
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {Message} from "../model/message";

import { BsFillPersonFill } from "react-icons/bs";
import { RiRobot2Fill } from "react-icons/ri";
import {GoogleMapsCard} from "./GoogleMapsCard.tsx";
import {showToolCallInChat} from "../utils/tools.ts";

const MessageContent = React.memo(({role, content, tool_calls}: Message) => {
  if (content === "") {
    return (<Discuss
      visible={true}
      height="2.5em"
      width="2.5em"
      ariaLabel="comment-loading"
      wrapperStyle={{}}
      wrapperClass="comment-wrapper"
      colors={["rgba(0, 0, 0, 0.4", "rgba(0, 0, 0, 0.26"]}
    />)
  }
  if (role === "user") {
    return (
      <div dangerouslySetInnerHTML={{ __html: toHtml(content || "") }}/>
    )
  }
  const markdown = (content && <Markdown
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
          />
        ) : (
          <code {...rest} className={className}>
            {children}
          </code>
        )
      }
    }}
  />)
  if (role === "assistant" && tool_calls) {
    return (<>
      {markdown}
      {tool_calls
        .filter(showToolCallInChat)
        .map((tool_call, index) => {
          console.log("Displaying function call in chat:", tool_call.function.name);
          switch (tool_call.function.name) {
            case "show_image": {
              const args: { image: string } = JSON.parse(tool_call.function.arguments);
              return (
                <div key={index} dangerouslySetInnerHTML={{__html: args.image}}/>
              )
            }
            case "show_map": {
              const args: {
                latitude: number,
                longitude: number,
                zoom: number
              } = JSON.parse(tool_call.function.arguments);
              return (
                <GoogleMapsCard
                  key={index}
                  latitude={args.latitude}
                  longitude={args.longitude}
                  zoom={args.zoom}
                />
              )
            }
            case "show_directions": {
              const args: {
                origin: string,
                destination: string,
                travelMode: google.maps.TravelMode
              } = JSON.parse(tool_call.function.arguments);
              return (
                <GoogleMapsCard
                  key={index}
                  directions={{
                    origin: args.origin,
                    destination: args.destination,
                    travelMode: args.travelMode
                  }}
                />
              )
            }
            case "show_transit_directions": {
              const args: {
                origin: string,
                destination: string,
                arrivalTime: string,
                departureTime: string,
                modes: google.maps.TransitMode[],
                routingPreference: google.maps.TransitRoutePreference
              } = JSON.parse(tool_call.function.arguments);
              return (
                <GoogleMapsCard
                  key={index}
                  directions={{
                    origin: args.origin,
                    destination: args.destination,
                    transitOptions: {
                      arrivalTime: args.arrivalTime ? new Date(args.arrivalTime) : undefined,
                      departureTime: args.departureTime ? new Date(args.departureTime) : undefined,
                      modes: args.modes,
                      routingPreference: args.routingPreference
                    },
                    travelMode: "TRANSIT" as google.maps.TravelMode
                  }}
                />
              )
            }
          }
        })
      }
    </>)
  }
  return markdown;
});

export const MessageCard = React.forwardRef(({ className, message }: Props, ref: React.ForwardedRef<HTMLDivElement>) => {
  // const user = "😀";
  // const assistant = "🤖";
  return (
    <div className={className} ref={ref}>
      {message.role === "user" ?
        <BsFillPersonFill className="role"/>
        :
        <RiRobot2Fill className="role"/>
      }
      <div className="content">
        <MessageContent
          role={message.role}
          content={message.content}
          tool_calls={message.tool_calls}
        />
      </div>
    </div>
  );
});

interface Props {
  message: Message
  className: string
  ref?: React.Ref<HTMLDivElement>
}

function toHtml(text: string) {
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  const sections = text.split('\n\n');
  
  text = sections.map(section => {
    // If the section has leading whitespace anywhere, wrap it in <pre>.
    if (section.match(/(^|\n)[ \t]+/)) {
      return `<pre>${section}</pre>`;
    } else {
      // Just regular newlines, wrap in <p>.
      return section.split('\n').map(line => `<p>${line}</p>`).join('');
    }
  }).join('');
  return text;
}