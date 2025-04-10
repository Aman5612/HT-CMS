"use client";

import { useEffect, useState } from "react";

export default function PostRenderer({ post }: any) {
  const [renderedContent, setRenderedContent] = useState([]);

  useEffect(() => {
    const renderContent = async () => {
      if (!post) {
        setRenderedContent([
          <div key="error">No post data available</div>,
        ] as any);
        return;
      }

      const output = [];
      let cardIndex = 0;
      let mediaIndex = 0;

      // Split content by card block placeholders
      const parts = post.content.split(/\[Card Block ID: (.*?)\]/g);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (i % 2 === 0) {
          // Regular content (between card blocks)
          const parser = new DOMParser();
          const doc = parser.parseFromString(part, "text/html");
          const mediaElements = doc.querySelectorAll("img, video");

          let contentWithMedia = part;
          mediaElements.forEach((el) => {
            if (mediaIndex < post.media.length) {
              const media = post.media[mediaIndex];
              contentWithMedia = contentWithMedia.replace(
                el.outerHTML,
                media.type === "image"
                  ? `<img src="${media.url}" alt="Post image" />`
                  : `<video src="${media.url}" controls />`
              );
              mediaIndex++;
            }
          });

          output.push(
            <div
              key={`content-${i}`}
              dangerouslySetInnerHTML={{ __html: contentWithMedia }}
            />
          );
        } else {
          // Card block ID
          if (cardIndex < post.cardBlocks.length) {
            const cardBlock = post.cardBlocks[cardIndex];
            const response = await fetch(`/api/cards/${cardBlock.cardId}`);
            const cardData = await response.json();

            output.push(
              <div
                key={`card-${cardIndex}`}
                className="card-block flex gap-4 my-4"
              >
                <img
                  src={cardData.image}
                  alt={cardData.title}
                  className="w-32 h-32 object-cover"
                />
                <div>
                  <h3 className="text-lg font-bold">{cardData.title}</h3>
                  <p>{cardData.description}</p>
                  <p>From {cardData.price}</p>
                  <a href={cardData.link} className="text-blue-500">
                    Explore
                  </a>
                </div>
              </div>
            );
            cardIndex++;
          }
        }
      }

      setRenderedContent(output as any);
    };

    renderContent();
  }, [post]);

  return <div className="post-content">{renderedContent}</div>;
}
