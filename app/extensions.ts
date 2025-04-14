import { Node } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { locale } from "reactjs-tiptap-editor/locale-bundle";
import {
  Attachment,
  BaseKit,
  Blockquote,
  Bold,
  BulletList,
  Clear,
  Code,
  CodeBlock,
  Color,
  ColumnActionButton,
  Emoji,
  Excalidraw,
  ExportPdf,
  ExportWord,
  FontFamily,
  FontSize,
  FormatPainter,
  Heading,
  Highlight,
  History,
  HorizontalRule,
  Iframe,
  Image,
  ImageGif,
  ImportWord,
  Indent,
  Italic,
  Katex,
  LineHeight,
  Link,
  Mention,
  Mermaid,
  MoreMark,
  OrderedList,
  SearchAndReplace,
  SlashCommand,
  Strike,
  Table,
  TableOfContents,
  TaskList,
  TextAlign,
  TextDirection,
  Twitter,
  Underline,
  Video,
} from "reactjs-tiptap-editor/extension-bundle";
import "reactjs-tiptap-editor/style.css";
import "katex/dist/katex.min.css";

// Add this helper function at the top of the file
function safeUpdateAltTextMap(extension: any, src: string, alt: string) {
  try {
    if (extension && extension.storage && extension.storage.altTextMap && src) {
      extension.storage.altTextMap.set(src, alt);
      console.log(
        `SafeUpdateAltTextMap: Updated alt text for ${src} to "${alt}"`
      );
      return true;
    } else {
      console.warn(
        `SafeUpdateAltTextMap: Missing properties to update alt text for ${src}`
      );

      // Try to initialize the map if it doesn't exist
      if (extension && extension.storage && !extension.storage.altTextMap) {
        extension.storage.altTextMap = new Map();
        extension.storage.altTextMap.set(src, alt);
        console.log(
          `SafeUpdateAltTextMap: Created new altTextMap and set ${src} to "${alt}"`
        );
        return true;
      }
    }
  } catch (error) {
    console.error(
      `SafeUpdateAltTextMap: Error updating alt text for ${src}:`,
      error
    );
  }
  return false;
}

// Add this at the beginning of the file after all imports
// Global event handler for synchronizing alt text across components
if (typeof window !== "undefined") {
  // Wait for document to be ready
  window.addEventListener("DOMContentLoaded", () => {
    console.log("Setting up global alt text sync handler");

    // Create a global cache for alt text
    window.globalAltTextCache = window.globalAltTextCache || new Map();

    // Enable debugging of alt text handling
    const DEBUG_ALT_TEXT = true;

    // Listen for alt text changes
    document.addEventListener("alttextchanged", (event: any) => {
      if (event.detail && event.detail.src && event.detail.alt !== undefined) {
        const { src, alt } = event.detail;
        if (DEBUG_ALT_TEXT)
          console.log(`Global alt text changed: ${src} -> "${alt}"`);

        // Store in global cache
        window.globalAltTextCache.set(src, alt);

        // Find all images with this src and update them
        setTimeout(() => {
          try {
            const allImages = document.querySelectorAll(`img[src="${src}"]`);
            if (DEBUG_ALT_TEXT)
              console.log(`Found ${allImages.length} images with src ${src}`);

            allImages.forEach((img) => {
              // Also check if this image is inside the editor
              const editorRoot = img.closest(".ProseMirror");
              if (editorRoot) {
                // Find any extension to update its storage
                const extensionKeys = Object.keys(window).filter(
                  (key) =>
                    key.startsWith("__TIPTAP_EXTENSION_") &&
                    window[key].storage &&
                    window[key].storage.altTextMap
                );

                extensionKeys.forEach((key) => {
                  // Update the map
                  if (window[key].storage.altTextMap instanceof Map) {
                    window[key].storage.altTextMap.set(src, alt);
                    if (DEBUG_ALT_TEXT)
                      console.log(`Updated altTextMap in ${key}`);
                  }
                });
              }
            });
          } catch (error) {
            console.error("Error updating images:", error);
          }
        }, 0);
      }
    });

    // Set up an interval to periodically refresh alt text from cache
    setInterval(() => {
      try {
        if (
          !window.globalAltTextCache ||
          !(window.globalAltTextCache instanceof Map) ||
          window.globalAltTextCache.size === 0
        ) {
          return;
        }

        const images = document.querySelectorAll("img");
        images.forEach((img) => {
          const src = img.getAttribute("src");
          if (src && window.globalAltTextCache.has(src)) {
            const cachedAlt = window.globalAltTextCache.get(src);
            const currentAlt = img.getAttribute("alt") || "";

            if (cachedAlt && (!currentAlt || currentAlt !== cachedAlt)) {
              img.setAttribute("alt", cachedAlt);
              if (DEBUG_ALT_TEXT)
                console.log(
                  `Refreshed alt text from cache: ${src} -> "${cachedAlt}"`
                );
            }
          }
        });
      } catch (error) {
        console.error("Error in alt text refresh interval:", error);
      }
    }, 2000);
  });
}

// Custom CardBlock Extension
const CardBlock = Node.create({
  name: "cardBlock",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      packageId: {
        default: null,
      },
      position: {
        default: 0,
      },
      packageData: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="card-block"]',
        getAttrs: (dom) => ({
          packageId: dom.getAttribute("data-package-id"),
          position: parseInt(dom.getAttribute("data-position") || "0", 10),
          packageData: dom.getAttribute("data-package-data")
            ? JSON.parse(dom.getAttribute("data-package-data")!)
            : null,
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const packageData = node.attrs.packageData;
    if (!packageData) {
      return [
        "div",
        {
          "data-type": "card-block",
          "data-package-id": node.attrs.packageId,
          "data-position": node.attrs.position,
          class: "package-card-block",
          style: "border: 1px dashed gray; padding: 10px; text-align: center;",
        },
        `Loading package data...`,
      ];
    }

    // Create the card HTML structure
    const cardHtml = `
      <div class="package-card" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 10px 0;">
        <div class="package-header" style="padding: 15px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0; font-size: 1.25rem; color: #111827;">${
            packageData.name
          }</h3>
          ${
            packageData.tag
              ? `<span style="display: inline-block; padding: 2px 8px; background: #e5e7eb; border-radius: 4px; font-size: 0.875rem; margin-top: 5px;">${packageData.tag}</span>`
              : ""
          }
        </div>
        <div class="package-content" style="padding: 15px;">
          <div class="package-image" style="margin-bottom: 15px;">
            <img src="${
              packageData.banner_image ||
              packageData.image ||
              "/placeholder.jpg"
            }" 
                 alt="${packageData.name}"
                 style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px;">
          </div>
          <div class="package-details" style="font-size: 0.875rem; color: #4b5563;">
            <p style="margin: 0 0 10px 0;">${atob(
              packageData.short_description
            )}</p>
            <div class="package-meta" style="display: flex; gap: 15px; margin-top: 10px;">
              ${
                packageData.duration
                  ? `<span>${packageData.duration} Days</span>`
                  : ""
              }
              ${
                packageData.starting_price
                  ? `<span>₹${packageData.starting_price.toLocaleString()}</span>`
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;

    return [
      "div",
      {
        "data-type": "card-block",
        "data-package-id": node.attrs.packageId,
        "data-position": node.attrs.position,
        "data-package-data": JSON.stringify(packageData),
        class: "package-card-block",
      },
      cardHtml,
    ];
  },

  addCommands(): any {
    return {
      insertPackageCard:
        (packageId: string) =>
        ({ commands, editor }: { commands: any; editor: any }) => {
          // Fetch package data
          fetch(
            `https://holidaytribe.com:3000/package/getPackageByIds/${packageId}`
          )
            .then((response) => response.json())
            .then((data) => {
              if (data.status && data.result && data.result[0]) {
                const packageData = data.result[0];
                commands.insertContent({
                  type: this.name,
                  attrs: {
                    packageId,
                    packageData,
                  },
                });
              }
            })
            .catch((error) => {
              console.error("Error fetching package data:", error);
              // Insert a placeholder card with error state
              commands.insertContent({
                type: this.name,
                attrs: {
                  packageId,
                  packageData: null,
                },
              });
            });
        },
    };
  },
});

// Custom Image Extension with Alt Text Support
const CustomImage = Image.extend({
  priority: 100, // Higher priority to ensure it runs before other extensions

  addAttributes() {
    // Get the parent attributes
    const parentAttributes = this.parent?.();

    console.log("Image extension - addAttributes called", parentAttributes);

    // Return merged attributes
    return {
      ...parentAttributes,
      alt: {
        default: "",
        parseHTML: (element) => {
          const alt = element.getAttribute("alt") || "";
          console.log(
            "Image extension - parseHTML - reading alt attribute:",
            alt
          );
          return alt;
        },
        renderHTML: (attributes) => {
          console.log("Image extension - renderHTML - attributes:", attributes);
          // Always include the alt attribute even if empty to ensure it's preserved
          return { alt: attributes.alt || "" };
        },
      },
    };
  },

  // Storage for keeping track of alt text that needs to be preserved
  addStorage() {
    return {
      altTextMap: new Map(),
    };
  },

  // Add global styles to the document when the extension is loaded
  onBeforeCreate() {
    if (typeof document !== "undefined") {
      // Check if the style already exists
      if (!document.getElementById("tiptap-image-edit-styles")) {
        // Create a style element
        const style = document.createElement("style");
        style.id = "tiptap-image-edit-styles";
        style.innerHTML = `
          .ProseMirror img {
            transition: all 0.2s ease-in-out;
            cursor: pointer;
            position: relative;
          }
          
          .ProseMirror img:hover {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          }
          
          .ProseMirror div:has(> img) {
            position: relative;
            display: inline-block;
            margin: 2px;
          }
          
          .ProseMirror .image-alt-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #4b5563;
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            border-radius: 4px;
            pointer-events: none;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: system-ui, sans-serif;
            font-weight: 500;
          }
          
          .ProseMirror img[alt=""] + .image-alt-badge,
          .ProseMirror div:has(> img[alt=""]) .image-alt-badge,
          .ProseMirror .image-container:has(> img[alt=""]) .image-alt-badge,
          .image-alt-badge.no-alt {
            background: #ef4444 !important;
            font-weight: bold;
            border-radius: 50%;
            width: 10px;
            height: 10px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .ProseMirror .ProseMirror-selectednode img {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
          
          /* Force badge to be visible */
          .image-alt-badge {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
        `;
        document.head.appendChild(style);

        // Add a global MutationObserver to automatically update badges
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (
              mutation.type === "attributes" &&
              mutation.attributeName === "alt" &&
              mutation.target instanceof HTMLImageElement
            ) {
              const img = mutation.target;
              const hasAlt = img.alt && img.alt.trim() !== "";

              // Find the badge and update it
              const container = img.closest(".image-container");
              if (container) {
                const badge = container.querySelector(".image-alt-badge");
                if (badge) {
                  badge.textContent = hasAlt ? "ALT" : "";
                  (badge as HTMLElement).style.backgroundColor = hasAlt
                    ? "#4b5563"
                    : "#ef4444";
                  if (!hasAlt) badge.classList.add("no-alt");
                  else badge.classList.remove("no-alt");
                }
              }
            }
          });
        });

        // Start observing the document
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["alt"],
          subtree: true,
        });
      }
    }
  },

  // Force preservation of alt text on content update
  onUpdate() {
    if (typeof document !== "undefined") {
      const altTextMap = this.storage.altTextMap;
      if (altTextMap && altTextMap.size > 0) {
        setTimeout(() => {
          try {
            const editorImgs = document.querySelectorAll(".ProseMirror img");
            editorImgs.forEach((element) => {
              const img = element as HTMLImageElement;
              if (img.src && altTextMap.has(img.src)) {
                const altText = altTextMap.get(img.src) || "";
                console.log(
                  `Forcing alt text on update: ${img.src} -> "${altText}"`
                );

                // Update the DOM element
                img.setAttribute("alt", altText);

                // Update badge if it exists
                const badge = img.nextElementSibling;
                if (badge && badge.classList.contains("image-alt-badge")) {
                  badge.textContent = altText ? "ALT" : "";
                  (badge as HTMLElement).style.backgroundColor = altText
                    ? "#4b5563"
                    : "#ef4444";
                }
              }
            });
          } catch (error) {
            console.error("Error updating alt text:", error);
          }
        }, 100);
      }
    }
  },

  // Enhanced onCreate to capture alt text from the initial content
  onCreate() {
    console.log("Image extension onCreate - initializing alt text tracking");
    if (typeof document !== "undefined") {
      // Make sure we have our altTextMap
      if (!this.storage.altTextMap) {
        console.log("Creating new altTextMap in onCreate");
        this.storage.altTextMap = new Map();
      }

      // Initialize the alt text map with values from the content
      setTimeout(() => {
        try {
          // Check images in the editor
          const editorImgs = document.querySelectorAll(".ProseMirror img");
          console.log(`Found ${editorImgs.length} images in the editor`);

          editorImgs.forEach((element, index) => {
            const img = element as HTMLImageElement;
            const alt = img.getAttribute("alt") || "";

            console.log(`Image #${index}: src=${img.src}, alt="${alt}"`);

            // Store the alt text in our map
            safeUpdateAltTextMap(this, img.src, alt);

            // Ensure the badge reflects the alt text status
            const container = img.closest(".image-container");
            if (container) {
              const badge = container.querySelector(".image-alt-badge");
              if (badge) {
                const hasAlt = alt && alt.trim() !== "";
                badge.textContent = hasAlt ? "ALT" : "";
                (badge as HTMLElement).style.backgroundColor = hasAlt
                  ? "#4b5563"
                  : "#ef4444";
                if (!hasAlt) badge.classList.add("no-alt");
                else badge.classList.remove("no-alt");

                console.log(
                  `Updated badge for image #${index}: hasAlt=${hasAlt}`
                );
              }
            }
          });
        } catch (error) {
          console.error("Error storing initial alt text:", error);
        }
      }, 500);
    }
  },

  // Force the alt text to be applied to the node's attributes
  onTransaction({ transaction, editor }) {
    // Check if this is a docChanged transaction
    if (transaction.docChanged) {
      // Find all image nodes in the document
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "image") {
          // Try to find this image in the DOM and check its alt text
          setTimeout(() => {
            try {
              const domImg = document.querySelector(
                `img[src="${node.attrs.src}"]`
              ) as HTMLImageElement;

              // Check if the image exists and if it has alt text from our stored map
              if (
                domImg &&
                domImg.src &&
                this.storage.altTextMap &&
                this.storage.altTextMap.has(domImg.src)
              ) {
                const storedAlt = this.storage.altTextMap.get(domImg.src);
                if (storedAlt && storedAlt !== node.attrs.alt) {
                  console.log(
                    "Forcing alt text from storage to ProseMirror:",
                    storedAlt
                  );
                  editor.commands.command(({ tr }) => {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      alt: storedAlt,
                    });
                    return true;
                  });
                }
              }

              // Also check if DOM has alt text that the node doesn't
              if (domImg && domImg.alt && domImg.alt !== node.attrs.alt) {
                console.log(
                  "Syncing alt text from DOM to ProseMirror:",
                  domImg.alt
                );
                editor.commands.command(({ tr }) => {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    alt: domImg.alt,
                  });
                  return true;
                });
              }
            } catch (error) {
              console.error("Error in onTransaction:", error);
            }
          }, 0);
        }
        return false; // Continue traversal
      });
    }
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      // Create the container
      const dom = document.createElement("div");
      dom.className = "image-container";

      // Create the image element
      const img = document.createElement("img");

      // Copy all HTML attributes to the img element
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        img.setAttribute(key, value);
      });

      // Ensure the alt attribute is copied from the node
      if (node.attrs.alt !== undefined) {
        console.log(
          `NodeView - Setting alt text from node: "${node.attrs.alt}"`
        );
        img.setAttribute("alt", node.attrs.alt);

        // Also store in our map
        if (img.src) {
          this.storage.altTextMap.set(img.src, node.attrs.alt);
        }
      }

      // Store a reference to the extension instance for later use
      const extension = this;

      // Create the badge element
      const badge = document.createElement("span");
      badge.className = "image-alt-badge";

      // Determine if we have alt text
      const hasAlt =
        img.getAttribute("alt") && img.getAttribute("alt")!.trim() !== "";
      badge.textContent = hasAlt ? "ALT" : "";
      badge.style.backgroundColor = hasAlt ? "#4b5563" : "#ef4444";
      if (!hasAlt) badge.classList.add("no-alt");

      // Force visibility
      badge.style.display = "block";
      badge.style.visibility = "visible";
      badge.style.opacity = "1";

      // Enhance the double-click handler to fix alt text display issues
      const handleDoubleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        // Get the current alt text directly from the image
        // This is the crucial part that needs to be fixed
        const currentAlt = img.getAttribute("alt") || "";

        console.log(
          `[ALT DEBUG] Double-click handler triggered for image:`,
          img.src
        );
        console.log(`[ALT DEBUG] Direct DOM alt attribute: "${currentAlt}"`);

        // Try to get the most accurate alt text from multiple sources
        // Check all possible sources and use the one with a value
        let altTextToShow = currentAlt;
        let altSource = "DOM element";

        // First check if we have alt text in the node attributes (most reliable source)
        if (node.attrs.alt !== undefined) {
          console.log(`[ALT DEBUG] Node attributes alt: "${node.attrs.alt}"`);
          if (
            node.attrs.alt &&
            (!altTextToShow || altTextToShow.trim() === "")
          ) {
            altTextToShow = node.attrs.alt;
            altSource = "Node attributes";
          }
        }

        // Then check global cache as second option
        if (
          window.globalAltTextCache &&
          window.globalAltTextCache.has(img.src)
        ) {
          const cachedAlt = window.globalAltTextCache.get(img.src);
          console.log(`[ALT DEBUG] Global cache alt: "${cachedAlt}"`);
          if (cachedAlt && (!altTextToShow || altTextToShow.trim() === "")) {
            altTextToShow = cachedAlt;
            altSource = "Global cache";
          }
        }

        // Finally check extension storage as last resort
        if (
          extension.storage?.altTextMap &&
          extension.storage.altTextMap.has(img.src)
        ) {
          const storedAlt = extension.storage.altTextMap.get(img.src);
          console.log(`[ALT DEBUG] Extension storage alt: "${storedAlt}"`);
          if (storedAlt && (!altTextToShow || altTextToShow.trim() === "")) {
            altTextToShow = storedAlt;
            altSource = "Extension storage";
          }
        }

        console.log(
          `[ALT DEBUG] Final alt text to show: "${altTextToShow}" (from ${altSource})`
        );

        // Create a custom modal instead of using prompt
        const modalBackdrop = document.createElement("div");
        modalBackdrop.style.position = "fixed";
        modalBackdrop.style.top = "0";
        modalBackdrop.style.left = "0";
        modalBackdrop.style.width = "100%";
        modalBackdrop.style.height = "100%";
        modalBackdrop.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        modalBackdrop.style.display = "flex";
        modalBackdrop.style.justifyContent = "center";
        modalBackdrop.style.alignItems = "center";
        modalBackdrop.style.zIndex = "9999";

        const modalContent = document.createElement("div");
        modalContent.style.backgroundColor = "white";
        modalContent.style.padding = "20px";
        modalContent.style.borderRadius = "8px";
        modalContent.style.width = "400px";
        modalContent.style.maxWidth = "90%";
        modalContent.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";

        const modalHeader = document.createElement("h3");
        modalHeader.textContent = "Edit Image Alt Text";
        modalHeader.style.margin = "0 0 16px 0";
        modalHeader.style.fontSize = "18px";
        modalHeader.style.fontWeight = "bold";
        modalHeader.style.color = "#111827";

        const modalDescription = document.createElement("p");
        modalDescription.textContent =
          "Alt text helps describe images to users with visual impairments and improves SEO.";
        modalDescription.style.margin = "0 0 16px 0";
        modalDescription.style.fontSize = "14px";
        modalDescription.style.color = "#6b7280";

        const imagePreview = document.createElement("div");
        imagePreview.style.width = "100%";
        imagePreview.style.height = "150px";
        imagePreview.style.marginBottom = "16px";
        imagePreview.style.position = "relative";
        imagePreview.style.borderRadius = "4px";
        imagePreview.style.overflow = "hidden";
        imagePreview.style.border = "1px solid #e5e7eb";

        const previewImg = document.createElement("img");
        previewImg.src = img.src;
        previewImg.alt = altTextToShow;
        previewImg.style.width = "100%";
        previewImg.style.height = "100%";
        previewImg.style.objectFit = "contain";

        const currentAltInfo = document.createElement("div");
        if (altTextToShow) {
          currentAltInfo.textContent = `Current alt text: "${altTextToShow}"`;
          currentAltInfo.style.fontSize = "14px";
          currentAltInfo.style.color = "#4b5563";
          currentAltInfo.style.margin = "0 0 12px 0";
          currentAltInfo.style.padding = "4px 8px";
          currentAltInfo.style.backgroundColor = "#f3f4f6";
          currentAltInfo.style.borderRadius = "4px";
        }

        const inputLabel = document.createElement("label");
        inputLabel.textContent = "Alt text:";
        inputLabel.style.display = "block";
        inputLabel.style.marginBottom = "8px";
        inputLabel.style.fontSize = "14px";
        inputLabel.style.fontWeight = "bold";
        inputLabel.style.color = "#374151";

        const input = document.createElement("input");
        input.type = "text";
        input.value = altTextToShow;
        input.placeholder = "Describe this image...";
        input.style.width = "100%";
        input.style.padding = "8px 12px";
        input.style.borderRadius = "4px";
        input.style.border = "1px solid #d1d5db";
        input.style.fontSize = "14px";
        input.style.marginBottom = "16px";

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "8px";

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.style.padding = "8px 16px";
        cancelButton.style.borderRadius = "4px";
        cancelButton.style.border = "1px solid #d1d5db";
        cancelButton.style.backgroundColor = "white";
        cancelButton.style.fontSize = "14px";
        cancelButton.style.cursor = "pointer";

        const saveButton = document.createElement("button");
        saveButton.textContent = "Save";
        saveButton.style.padding = "8px 16px";
        saveButton.style.borderRadius = "4px";
        saveButton.style.border = "1px solid transparent";
        saveButton.style.backgroundColor = "#3b82f6";
        saveButton.style.color = "white";
        saveButton.style.fontSize = "14px";
        saveButton.style.cursor = "pointer";

        // Add an option to remove alt text completely
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove Alt Text";
        removeButton.style.padding = "8px 16px";
        removeButton.style.borderRadius = "4px";
        removeButton.style.border = "1px solid #f43f5e";
        removeButton.style.backgroundColor = "white";
        removeButton.style.color = "#f43f5e";
        removeButton.style.fontSize = "14px";
        removeButton.style.marginRight = "auto";
        removeButton.style.cursor = "pointer";

        // Assemble the modal
        imagePreview.appendChild(previewImg);
        buttonContainer.appendChild(removeButton);
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalDescription);
        modalContent.appendChild(imagePreview);

        // Add current alt info if it exists
        if (altTextToShow) {
          modalContent.appendChild(currentAltInfo);
        }

        modalContent.appendChild(inputLabel);
        modalContent.appendChild(input);
        modalContent.appendChild(buttonContainer);

        modalBackdrop.appendChild(modalContent);
        document.body.appendChild(modalBackdrop);

        // Focus the input
        input.focus();
        input.select();

        // Handle cancel button
        cancelButton.addEventListener("click", () => {
          document.body.removeChild(modalBackdrop);
        });

        // Handle ESC key
        modalBackdrop.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            document.body.removeChild(modalBackdrop);
          }
        });

        // Handle remove button
        removeButton.addEventListener("click", () => {
          // Update the alt text to empty string
          updateAltText("");
          document.body.removeChild(modalBackdrop);
        });

        // Handle save button
        saveButton.addEventListener("click", () => {
          updateAltText(input.value);
          document.body.removeChild(modalBackdrop);
        });

        // Also handle ENTER key
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            updateAltText(input.value);
            document.body.removeChild(modalBackdrop);
          }
        });

        // Function to update alt text in all places
        function updateAltText(newAlt: string) {
          try {
            console.log(
              `[ALT DEBUG] Updating alt text from "${altTextToShow}" to "${newAlt}"`
            );

            // Update the ProseMirror model
            const pos = getPos();
            if (typeof pos === "number") {
              editor.commands.command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  alt: newAlt,
                });
                return true;
              });
            }

            // Update the element directly
            img.setAttribute("alt", newAlt);

            // Update badge
            badge.textContent = newAlt ? "ALT" : "";
            badge.style.backgroundColor = newAlt ? "#4b5563" : "#ef4444";

            if (newAlt) {
              badge.classList.remove("no-alt");
            } else {
              badge.classList.add("no-alt");
            }

            // Store in global cache
            if (window.globalAltTextCache) {
              window.globalAltTextCache.set(img.src, newAlt);
            }

            // Store in extension
            safeUpdateAltTextMap(extension, img.src, newAlt);

            // Dispatch event
            const event = new CustomEvent("alttextchanged", {
              detail: { src: img.src, alt: newAlt },
            });
            document.dispatchEvent(event);

            console.log("[ALT DEBUG] Alt text updated successfully");
          } catch (err) {
            console.error("[ALT DEBUG] Error updating alt text:", err);
          }
        }
      };

      // Add the double-click handler to both elements
      img.addEventListener("dblclick", handleDoubleClick);
      dom.addEventListener("dblclick", handleDoubleClick);

      // Append elements
      dom.appendChild(img);
      dom.appendChild(badge);

      return {
        dom,
        contentDOM: null,
        update(updatedNode) {
          if (updatedNode.type.name !== "image") return false;

          console.log("NodeView update - new alt text:", updatedNode.attrs.alt);

          // Update all attributes with better null checking
          Object.entries(updatedNode.attrs).forEach(([key, value]) => {
            if (key === "alt") {
              // Handle alt attribute specially with null safety
              console.log(
                `Setting alt attribute to "${
                  value !== null && value !== undefined ? value : ""
                }"`
              );
              img.setAttribute(
                key,
                value !== null && value !== undefined ? String(value) : ""
              );

              // Update our storage map using the stored extension reference
              if (img.src) {
                safeUpdateAltTextMap(
                  extension,
                  img.src,
                  value !== null && value !== undefined ? String(value) : ""
                );
              }
            } else if (key !== "alt" && value !== null && value !== undefined) {
              // Only set attributes for non-null values
              try {
                img.setAttribute(key, String(value));
              } catch (error) {
                console.error(`Error setting attribute ${key}:`, error);
              }
            }
          });

          // Update the badge
          const hasAlt =
            updatedNode.attrs.alt && updatedNode.attrs.alt.trim() !== "";
          badge.textContent = hasAlt ? "ALT" : "";
          badge.style.backgroundColor = hasAlt ? "#4b5563" : "#ef4444";

          if (hasAlt) {
            badge.classList.remove("no-alt");
          } else {
            badge.classList.add("no-alt");
          }

          return true;
        },
        destroy() {
          // Clean up event listeners
          img.removeEventListener("dblclick", handleDoubleClick);
          dom.removeEventListener("dblclick", handleDoubleClick);
        },
      };
    };
  },
}).configure({
  upload: async (file: File) => {
    console.log("Image extension - upload started for file:", file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "image");

    const response = await fetch("/blog-cms/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Image upload failed");
    const { url } = await response.json();
    console.log("Image extension - upload successful, received URL:", url);

    // Prompt the user for alt text
    const altText = prompt(
      "Please enter alt text for this image:",
      file.name || ""
    );
    console.log("Image extension - user entered alt text:", altText);

    // We will use this URL and alt text pair in the handleTransaction plugin
    window.lastUploadedImage = {
      url,
      alt: altText || "",
    };

    // Store the alt text in our map for persistence
    if (altText) {
      setTimeout(() => {
        try {
          const customImage = extensions.find((ext) => ext.name === "image");
          if (customImage) {
            customImage.storage.altTextMap.set(url, altText);
            console.log(
              `Stored alt text for new image: ${url} -> "${altText}"`
            );
          }
        } catch (error) {
          console.error("Error storing alt text for new image:", error);
        }
      }, 100);
    }

    // Return just the URL as required by the Image extension
    return url;
  },
  HTMLAttributes: {
    class: "image",
  },
});

// Check if this is the injectAltText function in @/app/extensions.ts
// Enhance the function to be smarter about preserving existing alt text

export function injectAltText(content: string): string {
  if (!content) return content;

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");
  const images = doc.querySelectorAll("img");
  let contentChanged = false;

  images.forEach((img) => {
    // Only add alt text if it's missing or empty
    if (!img.hasAttribute("alt") || img.getAttribute("alt") === "") {
      contentChanged = true;

      // Extract a filename-based alt text if possible
      const src = img.getAttribute("src") || "";
      const filename = src.split("/").pop() || "";
      const nameWithoutExt = filename.split(".")[0] || "Image";

      // Convert kebab-case or underscores to spaces, and capitalize first letter
      const altText = nameWithoutExt
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      img.setAttribute("alt", altText);
    }
  });

  // Only return the new content if changes were made
  return contentChanged ? doc.body.innerHTML : content;
}

// Update the window interface declaration
declare global {
  interface Window {
    lastUploadedImage: { url: string; alt: string } | null;
    globalAltTextCache: Map<string, string>;
    __TIPTAP_EXTENSION_IMAGE?: {
      storage: {
        altTextMap: Map<string, string>;
      };
    };
    [key: string]: any;
  }
}

// Initialize the lastUploadedImage property on window
if (typeof window !== "undefined") {
  window.lastUploadedImage = null;
}

// Export the extensions array
export const extensions = [
  BaseKit.configure({
    placeholder: {
      showOnlyCurrent: true,
    },
  }),
  History,
  SearchAndReplace,
  TableOfContents,
  FormatPainter.configure({ spacer: true }),
  Clear,
  FontFamily,
  Heading.configure({ spacer: true }),
  FontSize,
  Bold,
  Italic,
  Underline,
  Strike,
  MoreMark,
  Katex,
  Emoji,
  Color.configure({ spacer: true }),
  Highlight,
  BulletList,
  OrderedList,
  TextAlign.configure({ types: ["heading", "paragraph"], spacer: true }),
  Indent,
  LineHeight,
  TaskList.configure({
    spacer: true,
    taskItem: {
      nested: true,
    },
  }),
  Link,
  // Replace the default Image extension with our CustomImage
  CustomImage,
  Video.configure({
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "video");

      const response = await fetch("/blog-cms/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Video upload failed");
      const { url } = await response.json();
      return url;
    },
  }),
  ImageGif.configure({
    GIPHY_API_KEY: process.env.NEXT_PUBLIC_GIPHY_API_KEY || "", // Add your Giphy API key in .env
  }),
  Blockquote,
  SlashCommand,
  HorizontalRule,
  Code.configure({
    toolbar: false,
  }),
  CodeBlock.configure({ defaultTheme: "dracula" }),
  ColumnActionButton,
  Table,
  Iframe,
  ExportPdf.configure({ spacer: true }),
  ImportWord.configure({
    upload: (files: File[]) => {
      const f = files.map((file) => ({
        src: URL.createObjectURL(file),
        alt: file.name,
      }));
      return Promise.resolve(f);
    },
  }),
  ExportWord,
  Excalidraw,
  TextDirection,
  Mention,
  Attachment.configure({
    upload: async (file: any) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "attachment");

      const response = await fetch("/blog-cms/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Attachment upload failed");
      const { url } = await response.json();
      return url;
    },
  }),
  Mermaid.configure({
    upload: async (file: any) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "mermaid");

      const response = await fetch("/blog-cms/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Mermaid upload failed");
      const { url } = await response.json();
      return url;
    },
  }),
  Twitter,
  CardBlock, // Add the custom CardBlock extension
];
