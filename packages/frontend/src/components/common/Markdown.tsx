import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

function parseMath(text: string) {
  const result = [];
  let lastIndex = 0;
  const regex = /\[ (.*?) ]|\( (.*?) \)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before the math
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Block math
      result.push(<BlockMath key={lastIndex}>{match[1]}</BlockMath>);
    } else if (match[2] !== undefined) {
      // Inline math
      result.push(<InlineMath key={lastIndex}>{match[2]}</InlineMath>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Text after the last math
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

function convertTextChildrenToMath(children: React.ReactNode) {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return parseMath(child);
    }
    return child;
  });
}

interface MarkdownProps {
  content: string;
}

function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown
      children={content}
      components={{
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <SyntaxHighlighter
              PreTag="div"
              children={String(children).replace(/\n$/, "")}
              language={match[1]}
              style={oneLight}
              customStyle={{
                backgroundColor: "#dadada",
              }}
            />
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
        p(props) {
          const { children, ...rest } = props;
          return <p {...rest}>{convertTextChildrenToMath(children)}</p>;
        },
        li(props) {
          const { children, ...rest } = props;
          return <li {...rest}>{convertTextChildrenToMath(children)}</li>;
        },
        hr() {
          return <hr style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.2)" }} />;
        },
        a(props) {
          const { children, ...rest } = props;
          return (
            <a {...rest} target="_blank">
              {children}
            </a>
          );
        },
      }}
    />
  );
}

export default Markdown;
