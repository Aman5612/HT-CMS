"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import RichTextEditor from "reactjs-tiptap-editor";
import { extensions, injectAltText } from "@/app/extensions";
import TurndownService from "turndown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { RoleGate } from "@/components/role-gate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  MoveUp,
  MoveDown,
  X,
  Search,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function EditPostContent() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [featureImage, setFeatureImage] = useState("");
  const [featureImageAlt, setFeatureImageAlt] = useState("");
  const [outputFormat, setOutputFormat] = useState("html");
  const [isLoading, setIsLoading] = useState(true);
  const [postStatus, setPostStatus] = useState<
    "DRAFT" | "PUBLISHED" | "ARCHIVED"
  >("DRAFT");
  const [authorId, setAuthorId] = useState("");
  const [isAuthor, setIsAuthor] = useState(false);
  const editor = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [packageInput, setPackageInput] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [imageAltMap, setImageAltMap] = useState<Map<string, string>>(
    new Map()
  );
  const [showAltTextManager, setShowAltTextManager] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [relatedBlogIds, setRelatedBlogIds] = useState<string[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState("");
  const [blogSearchTerm, setBlogSearchTerm] = useState("");
  const [blogSearchResults, setBlogSearchResults] = useState<any[]>([]);
  const [showBlogSearchResults, setShowBlogSearchResults] = useState(false);
  const [availableBlogs, setAvailableBlogs] = useState<any[]>([]);
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [selectedBlogDetails, setSelectedBlogDetails] = useState<any[]>([]);
  const blogSearchRef = useRef<HTMLDivElement>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [existingPackageBlocks, setExistingPackageBlocks] = useState<
    Array<{ id: string; element: HTMLElement | null }>
  >([]);
  const [hiddenPackages, setHiddenPackages] = useState<string>("");

  // Table of Contents state
  const [tableOfContents, setTableOfContents] = useState<{
    sections: {
      id: string;
      title: string;
      subsections: { id: string; title: string }[];
    }[];
  }>({ sections: [] });
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSubsectionTitle, setNewSubsectionTitle] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSubsectionId, setEditingSubsectionId] = useState<string | null>(
    null
  );
  const [editingTitle, setEditingTitle] = useState("");
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  const turndownService = new TurndownService();

  const cleanImageContainers = (htmlContent: string) => {
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    console.log("Cleaning image containers and ALT badges");

    // Find all image container divs
    const imageContainers = doc.querySelectorAll(".image-container");
    console.log(`Found ${imageContainers.length} image containers to clean`);

    imageContainers.forEach((container) => {
      // Find the image inside the container
      const img = container.querySelector("img");
      if (img) {
        // Clone the img element to preserve its attributes
        const imgClone = img.cloneNode(true) as HTMLElement;
        // Replace the entire container with just the img element
        container.parentNode?.replaceChild(imgClone, container);
      }
    });

    // For any remaining standalone alt badges (not caught by the above)
    const altBadges = doc.querySelectorAll(".image-alt-badge");
    console.log(`Found ${altBadges.length} standalone ALT badges to remove`);

    altBadges.forEach((badge) => {
      badge.remove();
    });

    // Also handle any direct wrapping divs around images with badges as siblings
    const allImages = doc.querySelectorAll("img");
    allImages.forEach((img) => {
      // Check for badge as a sibling
      let nextSibling = img.nextElementSibling;
      if (nextSibling && nextSibling.classList.contains("image-alt-badge")) {
        nextSibling.remove();
      }

      // Also check if this image has any parent with class containing "image"
      // that might need special handling
      let parent = img.parentElement;
      if (parent && parent.className.includes("image")) {
        // If the parent only contains this image and possibly badges,
        // replace parent with just the image
        if (parent.childNodes.length <= 3) {
          // image + potential badges + text nodes
          const onlyImg = img.cloneNode(true) as HTMLElement;
          parent.parentNode?.replaceChild(onlyImg, parent);
        }
      }
    });

    // Get the final cleaned HTML
    const result = new XMLSerializer().serializeToString(doc);
    console.log("Cleaning complete");

    return result;
  };

  // Custom rule for images to preserve alt text
  turndownService.addRule("images", {
    filter: "img",
    replacement: function (content: string, node: any) {
      const alt = node.getAttribute("alt") || "";
      const src = node.getAttribute("src");
      return `![${alt}](${src})`;
    },
  });

  turndownService.addRule("cardBlock", {
    filter: (node: any) =>
      node.nodeName === "DIV" &&
      node.getAttribute("data-type") === "card-block",
    replacement: (content: any, node: any) => {
      const cardId = node.getAttribute("data-card-id");
      return `[Card Block ID: ${cardId}]`;
    },
  });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`);
        if (!response.ok) throw new Error("Failed to fetch post");
        const post = await response.json();
        setTitle(post.title);
        setPostStatus(post.status);
        setAuthorId(post.authorId || "");

        // Check if the current user is the author of this post
        if (session?.user?.id === post.authorId) {
          setIsAuthor(true);
        }

        console.log("Post fetched - SEO data:", {
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          featureImage: post.featureImage,
          featureImageAlt: post.featureImageAlt,
        });

        // Set post content and process packages
        if (post.content) {
          // Temporarily parse the content to extract packages
          const { filteredContent, packageContent } = filterPackagesFromContent(
            post.content
          );

          // Store packages for later restoration
          if (packageContent) {
            console.log(
              "Found packages in the loaded content, storing for later use"
            );
            setHiddenPackages(packageContent);
          }

          // Set the filtered content (without packages) as the editor content
          setContent(filteredContent);
        } else {
          setContent("");
        }

        // Log relatedBlogIds to verify if they exist in the fetched data
        console.log("Post related blog IDs:", post.relatedBlogIds);

        setMetaTitle(post.metaTitle || post.title);
        setMetaDescription(
          post.metaDescription ||
            post.content.replace(/<[^>]+>/g, "").substring(0, 160)
        );

        // Set feature image data if available
        if (post.featureImage) {
          console.log(`Setting feature image: ${post.featureImage}`);
          setFeatureImage(post.featureImage);
          setFeatureImageAlt(post.featureImageAlt || "");
        } else {
          console.log("No feature image found in post data");
        }

        // Set custom title and keywords if available
        setCustomTitle(post.customTitle || "");
        setKeywords(post.keywords || "");

        // Load related blog IDs if available
        if (post.relatedBlogIds && Array.isArray(post.relatedBlogIds)) {
          console.log("Loading related blog IDs:", post.relatedBlogIds);
          setRelatedBlogIds(post.relatedBlogIds);
        }

        // Load table of contents if available
        if (post.tableOfContents) {
          console.log("Loading table of contents:", post.tableOfContents);
          setTableOfContents(post.tableOfContents);
        }

        // Create database media mapping first (used throughout the process)
        const mediaMap = new Map();
        if (post.media && Array.isArray(post.media)) {
          console.log(
            `Processing ${post.media.length} media items from database`
          );
          post.media.forEach(
            (item: { type: string; url: string; alt?: string }) => {
              if (item.type === "image" && item.url) {
                // Store the clean URL to alt mapping
                mediaMap.set(item.url, item.alt || "");

                // Also cache it globally for the editor
                if (
                  typeof window !== "undefined" &&
                  window.globalAltTextCache
                ) {
                  window.globalAltTextCache.set(item.url, item.alt || "");
                  console.log(
                    `Added to global cache: ${item.url} -> "${item.alt || ""}"`
                  );
                }

                // Log debug info
                console.log(
                  `Stored media mapping: ${item.url} -> "${item.alt || ""}"`
                );
              }
            }
          );
        }

        // Process content to ensure alt text is preserved and filter out packages
        if (post.content) {
          // Initialize a DOM parser for safe HTML manipulation
          const parser = new DOMParser();
          const doc = parser.parseFromString(post.content, "text/html");
          const images = doc.querySelectorAll("img");
          console.log(`Found ${images.length} images in post content`);

          let contentChanged = false;

          // First pass: Apply alt text from database to images in content
          images.forEach((img, index) => {
            const src = img.getAttribute("src") || "";
            const currentAlt = img.getAttribute("alt") || "";

            console.log(
              `Checking image ${index}: src=${src}, current alt="${currentAlt}"`
            );

            // Try to find alt text for this image from media map
            if (src && mediaMap.has(src)) {
              const dbAlt = mediaMap.get(src);

              // Only override if the current alt is empty
              if (!currentAlt && dbAlt) {
                img.setAttribute("alt", dbAlt);
                contentChanged = true;
                console.log(`Applied alt text from DB: "${dbAlt}"`);
              }
            }
          });

          // Get the processed content with alt text
          let processedContent = contentChanged
            ? doc.body.innerHTML
            : post.content;

          // Filter packages from content before setting it in the editor
          const { filteredContent, packageContent } =
            filterPackagesFromContent(processedContent);
          setContent(filteredContent);
          setHiddenPackages(packageContent);

          console.log(
            "Content updated with preserved alt tags and packages filtered out"
          );

          // Scan for package blocks in the original content for displaying in modal
          scanContentForPackages(processedContent);
        } else {
          setContent("");
          console.log("Post had no content");
        }

        console.log(
          "Edit page - loaded post with content:",
          post.content ? post.content.substring(0, 200) + "..." : "No content"
        );

        // Sync alt text from media items for the editor components
        syncAltTextFromMediaItems(post);

        // Update our alt text manager map
        const extractedImageAltMap = extractImagesFromContent(
          post.content || ""
        );
        setImageAltMap(extractedImageAltMap);

        // Ensure all media items from DB exist in our maps
        if (post.media && Array.isArray(post.media)) {
          // This ensures we have ALL media items, even if they're not in the content
          post.media.forEach(
            (item: { type: string; url: string; alt?: string }) => {
              if (item.type === "image" && item.url) {
                // Add to alt text manager
                const newMap = new Map(extractedImageAltMap);
                if (!newMap.has(item.url)) {
                  newMap.set(item.url, item.alt || "");
                  setImageAltMap(newMap);
                }
              }
            }
          );
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        toast({
          title: "Error",
          description: "Failed to fetch post data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchPost();
  }, [id, toast, session]);

  useEffect(() => {
    // This effect runs after the component is mounted
    // It adds a special direct DOM manipulation script to fix badges

    const fixAltTextBadges = () => {
      if (editor.current) {
        console.log("Running DOM fix for alt text badges");

        // Find the editor's DOM element
        const editorElement = document.querySelector(".ProseMirror");
        if (!editorElement) {
          console.log("Could not find editor element");
          return;
        }

        // Find all images in the editor
        const images = editorElement.querySelectorAll("img");
        console.log(`Found ${images.length} images in the editor DOM`);

        // Check each image for alt text and update badges
        images.forEach((img: HTMLImageElement, index) => {
          console.log(`Direct DOM check of image ${index}: alt="${img.alt}"`);

          const hasAlt = img.alt && img.alt.trim() !== "";

          // Find the container and badge, or create them if they don't exist
          let container = img.closest(".image-container");
          let badge;

          if (container) {
            badge = container.querySelector(".image-alt-badge");
          } else {
            // Check if the badge is a sibling
            badge = img.nextElementSibling;
            if (!badge || !badge.classList.contains("image-alt-badge")) {
              // Create a new badge if none exists
              console.log(`Creating new badge for image ${index}`);
              badge = document.createElement("span");
              badge.className = "image-alt-badge";

              // Insert it after the image
              img.parentNode?.insertBefore(badge, img.nextSibling);
            }
          }

          // Update the badge if it exists
          if (badge) {
            badge.textContent = hasAlt ? "ALT" : "";
            (badge as HTMLElement).style.backgroundColor = hasAlt
              ? "#4b5563"
              : "#ef4444";

            if (hasAlt) {
              badge.classList.remove("no-alt");
            } else {
              badge.classList.add("no-alt");
            }

            // Force visibility
            (badge as HTMLElement).style.display = "block";
            (badge as HTMLElement).style.visibility = "visible";
            (badge as HTMLElement).style.opacity = "1";

            console.log(
              `Badge updated for image ${index}: ${badge.textContent}`
            );
          }
        });
      }
    };

    // Run the fix after a delay to ensure editor is fully loaded
    const timeoutId = setTimeout(fixAltTextBadges, 1000);

    // Also run the fix whenever content changes
    const handleContentChange = () => {
      setTimeout(fixAltTextBadges, 200);
    };

    document.addEventListener("alttextchanged", handleContentChange);

    return () => {
      // Cleanup
      clearTimeout(timeoutId);
      document.removeEventListener("alttextchanged", handleContentChange);
    };
  }, []);

  useEffect(() => {
    // After component mount, run a function to remove 'NO ALT' text (but keep elements)
    const hideNoAltText = () => {
      const editorElement = document.querySelector(".ProseMirror");
      if (!editorElement) return;

      // Function to traverse DOM and hide 'NO ALT' text (but keep elements)
      const processNoAltNodes = (node: any) => {
        // Skip badge elements which already handle this differently
        if (node.classList && node.classList.contains("image-alt-badge")) {
          return;
        }

        // Check text nodes
        if (node.nodeType === 3 && node.textContent.trim() === "NO ALT") {
          node.textContent = " "; // Replace with space instead of removing
          return;
        }

        // If element has exactly 'NO ALT' text and is not a badge
        if (
          node.nodeType === 1 &&
          !node.classList?.contains("image-alt-badge") &&
          node.textContent.trim() === "NO ALT"
        ) {
          node.textContent = " "; // Replace with space instead of removing
          return;
        }

        // Process children recursively
        const children = [...node.childNodes];
        children.forEach(processNoAltNodes);
      };

      processNoAltNodes(editorElement);
    };

    // Run this cleanup on mount and whenever content changes
    const observer = new MutationObserver(() => {
      hideNoAltText();
    });

    // Start observing after a short delay to ensure editor is mounted
    setTimeout(() => {
      const editorElement = document.querySelector(".ProseMirror");
      if (editorElement) {
        hideNoAltText(); // Run once immediately
        observer.observe(editorElement, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    }, 1000);

    return () => {
      observer.disconnect();
    };
  }, []);

  const insertCardBlock = () => {
    const cardId = prompt("Enter Card ID:");
    if (cardId && editor.current) {
      (editor.current as any).commands.insertCardBlock({ cardId, position: 0 });
    }
  };

  const insertPackageCard = () => {
    const packageId = prompt("Enter package ID:");
    if (!packageId || !editor.current) return;

    // Create a horizontal scrollable container for cards
    const containerHtml = `
      <div style="overflow-x: auto; white-space: nowrap; margin: 20px 0; padding: 10px 0; width: 100%; -webkit-overflow-scrolling: touch;">
        <div style="display: inline-flex; gap: 16px; padding: 0 4px;">
          <!-- Package cards will be inserted here -->
          <div style="display: inline-block; vertical-align: top; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); width: 280px; background: white;">
            <div style="height: 180px; overflow: hidden; position: relative; background-color: #f3f4f6;">
              <img src="/images/package.svg" alt="Package 1" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
            <div style="padding: 16px 20px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.3; white-space: normal;">
                Family Fun: Universal Beyond
              </h3>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; white-space: normal;">
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Resorts</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Clubs</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Beach</span>
              </div>
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px; white-space: normal;">
                Weekend getaway
              </div>
              <div style="font-weight: 600; font-size: 14px; color: #111827; white-space: normal;">
                From ₹29,000
              </div>
            </div>
          </div>
          
          <div style="display: inline-block; vertical-align: top; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); width: 280px; background: white;">
            <div style="height: 180px; overflow: hidden; position: relative; background-color: #f3f4f6;">
              <img src="/images/package.svg" alt="Package 2" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
            <div style="padding: 16px 20px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.3; white-space: normal;">
                Family Fun: Universal Beyond
              </h3>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; white-space: normal;">
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Resorts</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Clubs</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Beach</span>
              </div>
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px; white-space: normal;">
                Weekend getaway
              </div>
              <div style="font-weight: 600; font-size: 14px; color: #111827; white-space: normal;">
                From ₹29,000
              </div>
            </div>
          </div>
          
          <div style="display: inline-block; vertical-align: top; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); width: 280px; background: white;">
            <div style="height: 180px; overflow: hidden; position: relative; background-color: #f3f4f6;">
              <img src="/images/package.svg" alt="Package 3" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
            <div style="padding: 16px 20px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.3; white-space: normal;">
                Family Fun: Universal Beyond
              </h3>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; white-space: normal;">
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Resorts</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Clubs</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                <span style="display: inline-block; font-size: 12px; color: #4b5563;">Beach</span>
              </div>
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px; white-space: normal;">
                Weekend getaway
              </div>
              <div style="font-weight: 600; font-size: 14px; color: #111827; white-space: normal;">
                From ₹29,000
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert the horizontal scrollable container with cards
    editor.current.editor?.commands.insertContent(containerHtml);

    // We'll only fetch data if we need dynamic data - for now using static example
    // Uncomment this if you want to fetch and display dynamic data
    /*
    // Fetch package data
    fetch(`https://staging.holidaytribe.com:3000/package/getPackageByIds/${packageId}`)
      .then(response => response.json())
      .then(data => {
        if (data.status && data.result && data.result[0]) {
          const packageData = data.result[0];
          console.log("Package data received:", packageData);
          
          // Would update the container with dynamic data here
        }
      })
      .catch(error => {
        console.error('Error fetching package data:', error);
      });
    */
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log(
        "Starting post submission with improved image and package handling"
      );

      // Get the current editor content
      const editorElement = document.querySelector(".ProseMirror");
      let finalContent = editorElement
        ? editorElement.innerHTML || ""
        : content;

      // Clean the content to remove any ALT badges before saving
      finalContent = cleanImageContainers(finalContent);
      console.log("Cleaned content of ALT badges before submission");

      // Restore package blocks to the content before saving
      if (hiddenPackages) {
        console.log(
          "Found hidden packages to restore:",
          hiddenPackages.length,
          "bytes"
        );

        // Log package content details for debugging
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(hiddenPackages, "text/html");
          const packageWrappers = doc.querySelectorAll(".package-wrapper");
          console.log(
            `Restoring ${packageWrappers.length} package wrappers to content`
          );
        } catch (error) {
          console.error("Error parsing hiddenPackages:", error);
        }

        // Restore packages to the content
        finalContent = restorePackagesToContent(finalContent);
        console.log("Restored package blocks to content before submission");
      } else {
        console.log("No hidden packages found to restore");
      }

      // Log the final content length to help diagnose if packages are included
      console.log(
        "Final content length for submission:",
        finalContent.length,
        "bytes"
      );

      // Fetch current media from the API to ensure we don't lose existing images
      console.log("Fetching current post media to ensure persistence");
      const currentPostResponse = await fetch(`/api/posts/${id}`);
      if (!currentPostResponse.ok) {
        console.error("Failed to fetch current post data");
      }

      const currentPost = await currentPostResponse.json();
      const currentMediaMap = new Map();

      // Build map of all existing media
      if (currentPost.media && Array.isArray(currentPost.media)) {
        currentPost.media.forEach((item: any) => {
          if (item.url) {
            currentMediaMap.set(item.url, item);
            console.log(
              `Found existing media: ${item.url}, alt="${item.alt || ""}"`
            );
          }
        });
      }

      // Parse the content to extract images that are actually in the content
      const parser = new DOMParser();
      const doc = parser.parseFromString(finalContent, "text/html");

      // Get all images that currently exist in the content
      const contentImages = Array.from(doc.querySelectorAll("img"));
      console.log(`Found ${contentImages.length} images in content HTML`);

      // Create a map with all media items that should be saved
      const mediaItemsMap = new Map();

      // First add all images from content
      contentImages.forEach((img) => {
        const src = img.getAttribute("src") || "";
        const alt = img.getAttribute("alt") || "";

        if (src && src.trim() !== "") {
          console.log(`Including image from content: ${src}, alt="${alt}"`);
          mediaItemsMap.set(src, {
            url: src,
            type: "image",
            alt: alt,
          });
        }
      });

      // Then add any existing media that wasn't in the content but should be preserved
      // Check the imageAltMap which contains all images we've been tracking
      imageAltMap.forEach((alt, src) => {
        if (src && src.trim() !== "" && !mediaItemsMap.has(src)) {
          console.log(
            `Preserving existing media not in content: ${src}, alt="${alt}"`
          );
          mediaItemsMap.set(src, {
            url: src,
            type: "image",
            alt: alt,
          });
        }
      });

      // Ensure any media from the database that wasn't in our maps is also preserved
      currentMediaMap.forEach((item, url) => {
        if (!mediaItemsMap.has(url)) {
          console.log(
            `Preserving database media: ${url}, alt="${item.alt || ""}"`
          );
          mediaItemsMap.set(url, item);
        }
      });

      // Convert the map to an array for the API
      const mediaItems = Array.from(mediaItemsMap.values());
      console.log(`Prepared ${mediaItems.length} media items for submission`);

      // Extract card blocks
      const cardBlocks = Array.from(
        doc.querySelectorAll('div[data-type="card-block"]')
      ).map((block) => {
        const cardId = block.getAttribute("data-card-id") || "";
        const position = block.getAttribute("data-position") || "0";
        return {
          cardId,
          position: parseInt(position),
        };
      });

      // Make sure we're using the cleaned content
      let finalSubmitContent = finalContent; // This is already cleaned above
      console.log("Using cleaned content for final submission");

      // Handle markdown conversion if needed
      if (outputFormat === "markdown") {
        finalSubmitContent = turndownService.turndown(finalContent);
      }

      // Generate a slug from the title
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-");

      // Create the data object for the API
      const postData = {
        id,
        title,
        content: finalSubmitContent,
        slug,
        status: postStatus,
        excerpt:
          metaDescription || finalSubmitContent.substring(0, 157) + "...",
        authorId,
        metaTitle,
        metaDescription,
        featureImage,
        featureImageAlt,
        media: mediaItems,
        cardBlocks,
        customTitle,
        keywords,
        relatedBlogIds,
        tableOfContents,
        manualId: id, // Ensure we're sending the ID as manualId for API compatibility
      };

      // Log the relatedBlogIds before sending to verify
      console.log("Submitting relatedBlogIds:", relatedBlogIds);
      console.log("Full post data being sent:", postData);

      // Update the post via API
      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      // Read the response first - but don't await it twice
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        // Extract meaningful error message from various formats
        let errorMessage = "Failed to update post";
        let errorDetail = "";
        console.error("API Error Response:", responseData);

        if (responseData) {
          if (typeof responseData.error === "string") {
            // If it's a simple string error
            errorMessage = responseData.error;
          }

          // Check for the structured errorDetail from our updated API
          if (responseData.errorDetail) {
            const detail = responseData.errorDetail;

            if (detail.type === "unique_constraint") {
              errorMessage =
                detail.message ||
                `A post with this ${detail.field} already exists`;
              errorDetail = `Please use a different ${detail.field}`;
            } else if (detail.type === "foreign_key_constraint") {
              errorMessage = "Reference error";
              errorDetail =
                detail.message ||
                "One of the references in your post doesn't exist";
            }
          } else if (
            responseData.error &&
            typeof responseData.error !== "string"
          ) {
            // Fallback for other error formats
            const errorStr = JSON.stringify(responseData.error);
            if (errorStr.includes("Unique constraint failed")) {
              const match = errorStr.match(
                /Unique constraint failed on the fields: \(\`([^`]+)`\)/
              );
              if (match && match[1]) {
                errorMessage = `A post with this ${match[1]} already exists`;
                errorDetail = "Please use a different " + match[1];
              } else {
                errorMessage = "A post with these details already exists";
                errorDetail = "Please check for duplicate content";
              }
            } else if (errorStr.includes("Foreign key constraint failed")) {
              errorMessage = "Reference error";
              errorDetail =
                "One of the references in your post points to an item that doesn't exist";
            } else {
              // Use the error object as a string
              errorMessage = "Update failed";
              errorDetail = errorStr.substring(0, 100); // Limit length for toast
            }
          }
        }

        toast({
          title: "Error",
          description: errorDetail
            ? `${errorMessage}: ${errorDetail}`
            : errorMessage,
          variant: "destructive",
        });

        throw new Error(errorMessage);
      }

      console.log("API response after update:", responseData);

      toast({
        title: "Success",
        description: "Post updated successfully",
      });

      // Redirect to posts list
      router.push("/dashboard/posts");
    } catch (error) {
      console.error("Error updating post:", error);

      // Don't show another toast if we already showed one for the API error
      if (
        !(error instanceof Error && error.message.includes("already exists"))
      ) {
        toast({
          title: "Error",
          description: (error as Error).message || "Failed to update post",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Use a local loading state just for the image upload
      const imageUploadButton = document.getElementById(
        "featureImageUploadBtn"
      );
      if (imageUploadButton) {
        imageUploadButton.textContent = "Uploading...";
        imageUploadButton.setAttribute("disabled", "true");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");

      console.log("Uploading feature image:", file.name);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Feature image upload failed");
      const { url } = await response.json();

      console.log("Feature image uploaded successfully to:", url);
      setFeatureImage(url);

      // Use filename as default alt text
      if (!featureImageAlt) {
        setFeatureImageAlt(file.name.split(".")[0] || "");
      }

      toast({
        title: "Success",
        description: "Feature image uploaded successfully",
      });
    } catch (error: unknown) {
      console.error("Feature image upload error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload feature image",
        variant: "destructive",
      });
    } finally {
      // Reset the button state
      const imageUploadButton = document.getElementById(
        "featureImageUploadBtn"
      );
      if (imageUploadButton) {
        imageUploadButton.textContent = "Upload Image";
        imageUploadButton.removeAttribute("disabled");
      }

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchPackage = async (packageId: string) => {
    try {
      setIsLoadingPackages(true);

      // Try a direct fetch first
      try {
        const response = await fetch(
          `https://staging.holidaytribe.com:3000/package/getPackageByIds/${packageId}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.status && data.result && data.result[0]) {
            console.log("Package fetched successfully:", data.result[0]);
            // Add to packages list if not already present
            setPackages((prev) => {
              if (prev.some((p) => p.id === data.result[0].id)) {
                return prev;
              }
              return [...prev, data.result[0]];
            });
            return true;
          }
        }

        // If direct fetch fails, throw error to use fallback
        throw new Error("API fetch failed");
      } catch (apiError) {
        console.warn("Direct API fetch failed, using fallback data:", apiError);

        // Create a fallback package with the provided ID
        const fallbackPackage = {
          id: packageId,
          name: `Package ${packageId.substring(0, 8)}`,
          starting_price: 29000 + Math.floor(Math.random() * 10000),
          description: "Package details unavailable",
        };

        // Add fallback package to the list
        setPackages((prev) => {
          if (prev.some((p) => p.id === packageId)) {
            return prev;
          }
          return [...prev, fallbackPackage];
        });

        // Return true since we've added a fallback
        return true;
      }
    } catch (error) {
      console.error("Error in fetchPackage:", error);
      toast({
        title: "Warning",
        description: "Using local data - package service unavailable",
      });
      return true; // Still return true to add the ID to the list
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const addPackage = async () => {
    if (!packageInput.trim()) return;

    // Check if already added
    if (packages.some((p) => p.id === packageInput)) {
      toast({
        title: "Already added",
        description: "This package ID is already in the list",
      });
      return;
    }

    const success = await fetchPackage(packageInput);
    if (success) {
      setPackageInput("");
    }
  };

  const removePackage = (packageId: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== packageId));
  };

  const insertPackagesIntoContent = () => {
    if (!editor.current || packages.length === 0) return;

    // Create HTML for all packages in a horizontal scrollable container
    const packagesHtml = `
      <div style="overflow-x: auto; white-space: nowrap; margin: 20px 0; padding: 10px 0; width: 100%; -webkit-overflow-scrolling: touch;">
        <div style="display: inline-flex; gap: 16px; padding: 0 4px;">
          ${packages
            .map(
              (pkg) => `
            <div style="display: inline-block; vertical-align: top; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); width: 280px; background: white;">
              <div style="height: 180px; overflow: hidden; position: relative; background-color: #f3f4f6;">
                <img src="/images/package.svg" alt="${
                  pkg.name
                }" style="width: 100%; height: 100%; object-fit: cover; display: block;">
              </div>
              <div style="padding: 16px 20px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.3; white-space: normal;">
                  ${pkg.name}
                </h3>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; white-space: normal;">
                  <span style="display: inline-block; font-size: 12px; color: #4b5563;">Resorts</span>
                  <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                  <span style="display: inline-block; font-size: 12px; color: #4b5563;">Clubs</span>
                  <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                  <span style="display: inline-block; font-size: 12px; color: #4b5563;">Beach</span>
                </div>
                <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px; white-space: normal;">
                  Weekend getaway
                </div>
                <div style="font-weight: 600; font-size: 14px; color: #111827; white-space: normal;">
                  From ₹${
                    pkg.starting_price
                      ? pkg.starting_price.toLocaleString()
                      : "29,000"
                  }
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // Insert the content at cursor position
    editor.current.editor?.commands.insertContent(packagesHtml);

    toast({
      title: "Success",
      description: "Packages inserted into content",
    });
  };

  // Add a more aggressive method to force alt text to be visible and editable
  useEffect(() => {
    if (content && !isLoading) {
      console.log("Executing aggressive alt text loader effect");

      // Force a refresh of all images' alt text after loading content
      const refreshAltText = () => {
        try {
          // Use the DOM parser to extract image information
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, "text/html");
          const images = doc.querySelectorAll("img");
          console.log(
            `Found ${images.length} images in content to force refresh`
          );

          // Build a map of image URLs to alt text
          const imgAltMap = new Map();
          images.forEach((img, index) => {
            const src = img.getAttribute("src") || "";
            const alt = img.getAttribute("alt") || "";
            if (src) {
              console.log(`Saving image #${index} mapping: ${src} -> "${alt}"`);
              imgAltMap.set(src, alt);
            }
          });

          // After a delay, force the alt text onto any editor images
          setTimeout(() => {
            const editorImages = document.querySelectorAll(".ProseMirror img");
            console.log(
              `Found ${editorImages.length} images in editor to update`
            );

            // Apply the saved alt text
            editorImages.forEach((element, index) => {
              const img = element as HTMLImageElement;
              if (img.src && imgAltMap.has(img.src)) {
                const savedAlt = imgAltMap.get(img.src);
                console.log(
                  `Force-applying alt="${savedAlt}" to editor image #${index}`
                );
                img.alt = savedAlt;

                // Dispatch an event to make sure badges update
                const event = new CustomEvent("alttextchanged", {
                  detail: { src: img.src, alt: savedAlt },
                });
                document.dispatchEvent(event);
              }
            });
          }, 800);
        } catch (error) {
          console.error("Error in refreshAltText:", error);
        }
      };

      // Run immediately
      refreshAltText();

      // Also run this on any resize or user interaction to handle edge cases
      const refreshEvents = ["resize", "mouseup", "touchend"];
      const debouncedRefresh = () => {
        clearTimeout((window as any)._altRefreshTimeout);
        (window as any)._altRefreshTimeout = setTimeout(refreshAltText, 500);
      };

      refreshEvents.forEach((evt) =>
        window.addEventListener(evt, debouncedRefresh)
      );

      return () => {
        refreshEvents.forEach((evt) =>
          window.removeEventListener(evt, debouncedRefresh)
        );
      };
    }
  }, [content, isLoading]);

  const extractImagesFromContent = (htmlContent: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const images = doc.querySelectorAll("img");
      const newImageAltMap = new Map();

      images.forEach((img, index) => {
        const src = img.getAttribute("src") || "";
        const alt = img.getAttribute("alt") || "";
        if (src) {
          newImageAltMap.set(src, alt);
        }
      });

      return newImageAltMap;
    } catch (error) {
      console.error("Error extracting images:", error);
      return new Map();
    }
  };

  useEffect(() => {
    if (content) {
      const newImageAltMap = extractImagesFromContent(content);
      setImageAltMap(newImageAltMap);
    }
  }, [content]);

  const updateAllAltTexts = () => {
    if (!content || !editor.current) return;

    try {
      // Create a new DOM to modify content
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/html");
      const images = doc.querySelectorAll("img");
      let contentChanged = false;

      // Update alt text for each image
      images.forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (src && imageAltMap.has(src)) {
          const newAlt = imageAltMap.get(src) || "";
          const currentAlt = img.getAttribute("alt") || "";

          if (newAlt !== currentAlt) {
            img.setAttribute("alt", newAlt);
            contentChanged = true;

            // Dispatch event for global syncing
            const event = new CustomEvent("alttextchanged", {
              detail: { src, alt: newAlt },
            });
            document.dispatchEvent(event);
          }
        }
      });

      // Update editor content if needed
      if (contentChanged) {
        const newContent = doc.body.innerHTML;
        setContent(newContent);
        editor.current.setContent(newContent);

        toast({
          title: "Success",
          description: "All image alt texts updated",
        });
      }
    } catch (error) {
      console.error("Error updating all alt texts:", error);
      toast({
        title: "Error",
        description: "Failed to update alt texts",
        variant: "destructive",
      });
    }
  };

  // Function to synchronize alt text from media items to global cache and DOM
  const syncAltTextFromMediaItems = (postData: any) => {
    if (!postData || !postData.media || !Array.isArray(postData.media)) {
      console.log("No media items to sync alt text from");
      return;
    }

    // Make sure the globalAltTextCache exists
    if (typeof window !== "undefined" && !window.globalAltTextCache) {
      window.globalAltTextCache = new Map();
    }

    console.log(`Syncing alt text from ${postData.media.length} media items`);

    // Process each media item
    postData.media.forEach((item: any) => {
      if (item.type === "image" && item.url && item.alt !== undefined) {
        console.log(`Syncing alt text for ${item.url}: "${item.alt}"`);

        // Store in global cache
        if (window.globalAltTextCache) {
          window.globalAltTextCache.set(item.url, item.alt);
        }

        // Dispatch event to notify the UI
        setTimeout(() => {
          try {
            const event = new CustomEvent("alttextchanged", {
              detail: { src: item.url, alt: item.alt },
            });
            document.dispatchEvent(event);
            console.log(`Dispatched alt text change event for ${item.url}`);
          } catch (error) {
            console.error("Error dispatching alt text event:", error);
          }
        }, 0);
      }
    });
  };

  // Also add a useEffect to periodically check and refresh alt text
  useEffect(() => {
    if (!content || isLoading) return;

    // Explicitly check for and fix images with missing alt text
    const refreshAltTexts = () => {
      try {
        // Skip if global cache doesn't exist or is empty
        if (
          !window.globalAltTextCache ||
          window.globalAltTextCache.size === 0
        ) {
          return;
        }

        // Find all images in the editor
        const images = document.querySelectorAll(".ProseMirror img");
        console.log(
          `Found ${images.length} images in editor to check for alt text`
        );

        // Check each image - fix the type casting
        Array.from(images).forEach((element) => {
          const img = element as HTMLImageElement;
          const src = img.src;
          if (src && window.globalAltTextCache.has(src)) {
            const cachedAlt = window.globalAltTextCache.get(src);
            const currentAlt = img.getAttribute("alt") || "";

            // If alt text is missing or doesn't match, update it
            if (cachedAlt && currentAlt !== cachedAlt) {
              console.log(
                `Fixing alt text for ${src}: "${currentAlt}" => "${cachedAlt}"`
              );
              img.setAttribute("alt", cachedAlt);

              // Notify the UI
              const event = new CustomEvent("alttextchanged", {
                detail: { src, alt: cachedAlt },
              });
              document.dispatchEvent(event);
            }
          }
        });
      } catch (error) {
        console.error("Error refreshing alt texts:", error);
      }
    };

    // Run immediately
    refreshAltTexts();

    // Then set up an interval to periodically check
    const intervalId = setInterval(refreshAltTexts, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [content, isLoading]);

  const fetchBlogs = async () => {
    try {
      setIsLoadingBlogs(true);
      const response = await fetch("/api/posts");
      if (!response.ok) throw new Error("Failed to fetch blogs");

      const data = await response.json();
      console.log("Fetched blogs:", data);

      let blogsData = [];
      if (data && Array.isArray(data.posts)) {
        blogsData = data.posts;
      } else if (data && Array.isArray(data)) {
        blogsData = data;
      } else {
        console.error("Unexpected API response format:", data);
        toast({
          title: "Error",
          description: "Unexpected API response format",
          variant: "destructive",
        });
        return;
      }

      // Filter out the current blog from available blogs
      const filteredBlogs = blogsData.filter((blog: any) => blog.id !== id);
      setAvailableBlogs(filteredBlogs);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available blogs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBlogs(false);
    }
  };

  // Handle blog search
  const handleBlogSearch = (searchTerm: string) => {
    setBlogSearchTerm(searchTerm);

    if (!searchTerm.trim()) {
      setBlogSearchResults([]);
      setShowBlogSearchResults(false);
      return;
    }

    const results = availableBlogs.filter(
      (blog) =>
        (blog.id && blog.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (blog.title &&
          blog.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setBlogSearchResults(results);
    setShowBlogSearchResults(true);
  };

  // Handle click outside search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        blogSearchRef.current &&
        !blogSearchRef.current.contains(event.target as Node)
      ) {
        setShowBlogSearchResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectBlogFromSearch = (blog: any) => {
    setSelectedBlogId(blog.id);
    setBlogSearchTerm("");
    setShowBlogSearchResults(false);
    addRelatedBlog(blog);
  };

  const addRelatedBlog = (blog?: any) => {
    const blogToAdd =
      blog || availableBlogs.find((b) => b.id === selectedBlogId);

    if (!blogToAdd) {
      toast({
        title: "Error",
        description: "Blog not found",
        variant: "destructive",
      });
      return;
    }

    // Check if already added
    if (relatedBlogIds.includes(blogToAdd.id)) {
      toast({
        title: "Already added",
        description: "This blog is already in the related blogs list",
      });
      return;
    }

    setRelatedBlogIds((prev) => [...prev, blogToAdd.id]);
    setSelectedBlogDetails((prev) => [...prev, blogToAdd]);
    setSelectedBlogId("");
  };

  const removeRelatedBlog = (blogId: string) => {
    setRelatedBlogIds((prev) => prev.filter((id) => id !== blogId));
    setSelectedBlogDetails((prev) => prev.filter((blog) => blog.id !== blogId));
  };

  // Update selectedBlogDetails when relatedBlogIds changes or availableBlogs is fetched
  useEffect(() => {
    if (availableBlogs.length > 0 && relatedBlogIds.length > 0) {
      const details = relatedBlogIds
        .map((id) => availableBlogs.find((blog) => blog.id === id))
        .filter((blog) => blog !== undefined);

      setSelectedBlogDetails(details);
    }
  }, [availableBlogs, relatedBlogIds]);

  // Table of Contents functions
  const generateTableOfContents = () => {
    try {
      // Create a temporary DOM element to parse the content
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/html");

      // Find all headings (h1, h2, h3, etc.) in the content
      const headings = Array.from(
        doc.querySelectorAll("h1, h2, h3, h4, h5, h6")
      );

      if (headings.length === 0) {
        toast({
          title: "Warning",
          description:
            "No headings found in content to generate Table of Contents",
        });
        return;
      }

      // Determine the heading levels to use for sections vs subsections
      // Find the minimum heading level (h1 = 1, h2 = 2, etc.)
      const headingLevels = headings.map((h) => parseInt(h.tagName.charAt(1)));
      const minLevel = Math.min(...headingLevels);

      // Consider headings of minimum level and minimum+1 as section headings
      // All other lower headings will be subsections
      const sectionLevels = [minLevel, minLevel + 1];

      // Initialize the TOC structure
      const generatedToc = { sections: [] as any[] };

      // Group the headings by section
      let currentSection: any = null;

      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.charAt(1));
        const headingId =
          heading.id || `heading-${Math.random().toString(36).substring(2, 9)}`;
        const headingText = heading.textContent?.trim() || "Untitled Section";

        // If this is a top-level or second-level heading, treat it as a new section
        if (sectionLevels.includes(level)) {
          currentSection = {
            id: headingId,
            title: headingText,
            subsections: [],
          };
          generatedToc.sections.push(currentSection);
        }
        // If it's a lower-level heading and we have a current section, add as subsection
        else if (currentSection) {
          currentSection.subsections.push({
            id: headingId,
            title: headingText,
          });
        }
        // If we encounter a subsection heading before any section heading, create a default section
        else {
          currentSection = {
            id: `section-${Math.random().toString(36).substring(2, 9)}`,
            title: "Main Content",
            subsections: [
              {
                id: headingId,
                title: headingText,
              },
            ],
          };
          generatedToc.sections.push(currentSection);
        }
      });

      // Handle the case where we have sections but no subsections
      // Try to find text blocks or paragraphs following each section heading
      if (
        generatedToc.sections.some(
          (section) => section.subsections.length === 0
        )
      ) {
        generatedToc.sections.forEach((section) => {
          if (section.subsections.length === 0) {
            // Find the heading element for this section
            const sectionHeading = headings.find(
              (h) =>
                h.id === section.id || h.textContent?.trim() === section.title
            );

            if (sectionHeading) {
              // Find the next few elements after the heading
              let nextElement = sectionHeading.nextElementSibling;
              let count = 0;

              while (nextElement && count < 3) {
                // If we hit another heading, stop
                if (nextElement.tagName.match(/^H[1-6]$/)) {
                  break;
                }

                // If it's a paragraph or div with content, add it as a subsection
                if (
                  (nextElement.tagName === "P" ||
                    nextElement.tagName === "DIV") &&
                  nextElement.textContent?.trim()
                ) {
                  const subsectionTitle =
                    nextElement.textContent.trim().substring(0, 40) +
                    (nextElement.textContent.trim().length > 40 ? "..." : "");

                  section.subsections.push({
                    id: `subsection-${Math.random()
                      .toString(36)
                      .substring(2, 9)}`,
                    title: subsectionTitle,
                  });

                  count++;
                }

                nextElement = nextElement.nextElementSibling;
              }

              // If we still couldn't find subsections, add a default one
              if (section.subsections.length === 0) {
                section.subsections.push({
                  id: `subsection-${Math.random()
                    .toString(36)
                    .substring(2, 9)}`,
                  title: "Content",
                });
              }
            }
          }
        });
      }

      // Update the TOC state
      setTableOfContents(generatedToc);

      toast({
        title: "Success",
        description: "Table of Contents generated successfully",
      });
    } catch (error) {
      console.error("Error generating table of contents:", error);
      toast({
        title: "Error",
        description: "Failed to generate Table of Contents",
        variant: "destructive",
      });
    }
  };

  const addSection = () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Error",
        description: "Section title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setTableOfContents((prev) => ({
      sections: [
        ...prev.sections,
        {
          id: `section-${Math.random().toString(36).substring(2, 9)}`,
          title: newSectionTitle,
          subsections: [],
        },
      ],
    }));

    setNewSectionTitle("");
  };

  const addSubsection = (sectionId: string) => {
    if (!newSubsectionTitle.trim()) {
      toast({
        title: "Error",
        description: "Subsection title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setTableOfContents((prev) => ({
      sections: prev.sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            subsections: [
              ...section.subsections,
              {
                id: `subsection-${Math.random().toString(36).substring(2, 9)}`,
                title: newSubsectionTitle,
              },
            ],
          };
        }
        return section;
      }),
    }));

    setNewSubsectionTitle("");
    setCurrentSectionId(null);
  };

  const removeSection = (sectionId: string) => {
    setTableOfContents((prev) => ({
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const removeSubsection = (sectionId: string, subsectionId: string) => {
    setTableOfContents((prev) => ({
      sections: prev.sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            subsections: section.subsections.filter(
              (subsection) => subsection.id !== subsectionId
            ),
          };
        }
        return section;
      }),
    }));
  };

  const startEditingSection = (sectionId: string, title: string) => {
    setEditingSectionId(sectionId);
    setEditingTitle(title);
  };

  const startEditingSubsection = (subsectionId: string, title: string) => {
    setEditingSubsectionId(subsectionId);
    setEditingTitle(title);
  };

  const saveEditingSection = () => {
    if (!editingTitle.trim()) {
      toast({
        title: "Error",
        description: "Section title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setTableOfContents((prev) => ({
      sections: prev.sections.map((section) => {
        if (section.id === editingSectionId) {
          return {
            ...section,
            title: editingTitle,
          };
        }
        return section;
      }),
    }));

    setEditingSectionId(null);
    setEditingTitle("");
  };

  const saveEditingSubsection = (sectionId: string) => {
    if (!editingTitle.trim()) {
      toast({
        title: "Error",
        description: "Subsection title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setTableOfContents((prev) => ({
      sections: prev.sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            subsections: section.subsections.map((subsection) => {
              if (subsection.id === editingSubsectionId) {
                return {
                  ...subsection,
                  title: editingTitle,
                };
              }
              return subsection;
            }),
          };
        }
        return section;
      }),
    }));

    setEditingSubsectionId(null);
    setEditingTitle("");
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setTableOfContents((prev) => {
      const sectionIndex = prev.sections.findIndex(
        (section) => section.id === sectionId
      );

      if (
        (direction === "up" && sectionIndex === 0) ||
        (direction === "down" && sectionIndex === prev.sections.length - 1)
      ) {
        return prev;
      }

      const newSections = [...prev.sections];
      const targetIndex =
        direction === "up" ? sectionIndex - 1 : sectionIndex + 1;

      // Swap the sections
      [newSections[sectionIndex], newSections[targetIndex]] = [
        newSections[targetIndex],
        newSections[sectionIndex],
      ];

      return { sections: newSections };
    });
  };

  const moveSubsection = (
    sectionId: string,
    subsectionId: string,
    direction: "up" | "down"
  ) => {
    setTableOfContents((prev) => {
      const sectionIndex = prev.sections.findIndex(
        (section) => section.id === sectionId
      );

      if (sectionIndex === -1) return prev;

      const section = prev.sections[sectionIndex];
      const subsectionIndex = section.subsections.findIndex(
        (subsection) => subsection.id === subsectionId
      );

      if (
        (direction === "up" && subsectionIndex === 0) ||
        (direction === "down" &&
          subsectionIndex === section.subsections.length - 1)
      ) {
        return prev;
      }

      const newSubsections = [...section.subsections];
      const targetIndex =
        direction === "up" ? subsectionIndex - 1 : subsectionIndex + 1;

      // Swap the subsections
      [newSubsections[subsectionIndex], newSubsections[targetIndex]] = [
        newSubsections[targetIndex],
        newSubsections[subsectionIndex],
      ];

      const newSections = [...prev.sections];
      newSections[sectionIndex] = {
        ...section,
        subsections: newSubsections,
      };

      return { sections: newSections };
    });
  };

  // Add useEffect to fetch blogs
  useEffect(() => {
    fetchBlogs();
  }, []);

  // Add this function to scan content for packages
  const scanContentForPackages = (htmlContent: string) => {
    if (!htmlContent) return [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      // Track processed elements to avoid duplicates
      const processedElements = new Set();
      const foundPackages: Array<{ id: string; element: HTMLElement | null }> =
        [];

      // Create a fingerprint for an element to help with deduplication
      const getElementFingerprint = (el: Element): string => {
        // Use element attributes and structure to create a unique fingerprint
        const attrs = Array.from(el.attributes)
          .map((attr) => `${attr.name}="${attr.value}"`)
          .join(" ");

        // Include a truncated version of innerHTML to avoid excessive memory usage
        const content = el.innerHTML.substring(0, 100);

        // Include node name and position in parent
        const parent = el.parentElement;
        let position = 0;
        if (parent) {
          position = Array.from(parent.children).indexOf(el);
        }

        return `${el.nodeName}-pos${position}-${attrs}-${content.length}`;
      };

      // Find all explicitly marked package blocks first
      const packageBlocks = doc.querySelectorAll(
        '.packages-block, [data-editor-block="package-cards"]'
      );

      // Process explicitly marked package blocks first
      packageBlocks.forEach((block, index) => {
        const fingerprint = getElementFingerprint(block);

        if (!processedElements.has(fingerprint)) {
          processedElements.add(fingerprint);
          foundPackages.push({
            id: `pkg-explicit-${index}`,
            element: block as HTMLElement,
          });

          // Mark this element and its parent to avoid duplicates
          if (block.parentElement) {
            processedElements.add(getElementFingerprint(block.parentElement));
          }
        }
      });

      // Find horizontal scroll containers that might be package blocks
      const horizontalScrollContainers = doc.querySelectorAll(
        'div[style*="overflow-x: auto"][style*="white-space: nowrap"]'
      );

      horizontalScrollContainers.forEach((container, index) => {
        const fingerprint = getElementFingerprint(container);

        // Skip if we've already processed this container
        if (processedElements.has(fingerprint)) {
          return;
        }

        // Check if this container is a child of an already processed element
        let parent = container.parentElement;
        let isChildOfProcessed = false;
        while (parent) {
          if (processedElements.has(getElementFingerprint(parent))) {
            isChildOfProcessed = true;
            break;
          }
          parent = parent.parentElement;
        }

        if (isChildOfProcessed) {
          return;
        }

        // Check if this container has card-like elements with titles that could be packages
        const cardElements = container.querySelectorAll(
          'div[style*="border-radius"][style*="overflow: hidden"]'
        );

        if (cardElements.length > 0) {
          processedElements.add(fingerprint);

          // This looks like a package display
          foundPackages.push({
            id: `pkg-container-${index}`,
            element: container as HTMLElement,
          });
        }
      });

      console.log(`Identified ${foundPackages.length} unique package blocks`);
      setExistingPackageBlocks(foundPackages);
      return foundPackages;
    } catch (error) {
      console.error("Error scanning for packages:", error);
      return [];
    }
  };

  // Function to filter package blocks from content for editor display
  const filterPackagesFromContent = (htmlContent: string) => {
    if (!htmlContent) return { filteredContent: "", packageContent: "" };

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      // Use a more selective approach to avoid duplicates
      // First get explicitly marked packages
      const packageBlocks = Array.from(
        doc.querySelectorAll(
          '.packages-block, [data-editor-block="package-cards"]'
        )
      );

      // Then get unmarked horizontal scroll containers that look like packages
      // but exclude any that are descendants of already found package blocks
      const processedParents = new Set();
      packageBlocks.forEach((block) => {
        processedParents.add(block);
      });

      const horizontalScrollContainers = Array.from(
        doc.querySelectorAll(
          'div[style*="overflow-x: auto"][style*="white-space: nowrap"]'
        )
      ).filter((container) => {
        // Check if this is or is inside an already processed block
        let current = container;
        while (current) {
          if (processedParents.has(current)) {
            return false;
          }
          current = current.parentElement as Element;
        }

        // Must have card-like elements to be considered a package container
        const cardElements = container.querySelectorAll(
          'div[style*="border-radius"][style*="overflow: hidden"]'
        );
        return cardElements.length > 0;
      });

      // Combine unique package blocks
      const allPackageBlocks = [
        ...packageBlocks,
        ...horizontalScrollContainers,
      ];
      console.log(
        `Filtering ${allPackageBlocks.length} unique package blocks from editor content`
      );

      // Create a document to store the removed packages
      const packageDoc = parser.parseFromString(
        '<div id="package-container"></div>',
        "text/html"
      );
      const packageContainer = packageDoc.getElementById("package-container");

      // Remove each package block and store it with position information
      allPackageBlocks.forEach((block, index) => {
        // Get the exact path to this element for precise positioning when restored
        const path = [];
        let currentEl = block;
        let parentEl = block.parentElement;

        // Capture the full path to this element from its parent down to body
        while (
          parentEl &&
          parentEl !== doc.body &&
          parentEl.nodeName !== "BODY"
        ) {
          const siblings = Array.from(parentEl.children);
          const position = siblings.indexOf(currentEl);
          path.unshift({ tag: parentEl.nodeName, position });
          currentEl = parentEl;
          parentEl = parentEl.parentElement;
        }

        // Get position in body if direct child
        if (
          parentEl &&
          (parentEl === doc.body || parentEl.nodeName === "BODY")
        ) {
          const bodyChildren = Array.from(parentEl.children);
          const bodyPosition = bodyChildren.indexOf(currentEl);
          path.unshift({ tag: "BODY", position: bodyPosition });
        }

        // Create a placeholder to mark where the package was
        const placeholder = doc.createElement("div");
        placeholder.className = "package-placeholder";
        placeholder.setAttribute("data-package-index", index.toString());

        // Store detailed path information for exact restoration
        placeholder.setAttribute("data-path", JSON.stringify(path));

        // Also store simple parent/position for backward compatibility
        const parentNode = block.parentNode;
        if (parentNode) {
          const childNodes = Array.from(parentNode.childNodes);
          const position = childNodes.indexOf(block);
          placeholder.setAttribute(
            "data-parent-signature",
            parentNode.nodeName
          );
          placeholder.setAttribute("data-position", position.toString());
        }

        placeholder.style.display = "none";

        // Clone the package block to the storage container
        if (packageContainer) {
          const packageWrapper = packageDoc.createElement("div");
          packageWrapper.className = "package-wrapper";
          packageWrapper.setAttribute("data-package-index", index.toString());
          packageWrapper.setAttribute("data-path", JSON.stringify(path));
          packageWrapper.appendChild(block.cloneNode(true));
          packageContainer.appendChild(packageWrapper);
        }

        // Replace the package block with the placeholder
        block.parentNode?.replaceChild(placeholder, block);
      });

      // Get the filtered content and package content
      const filteredContent = doc.body.innerHTML;
      const packageContent = packageContainer ? packageContainer.innerHTML : "";

      return { filteredContent, packageContent };
    } catch (error) {
      console.error("Error filtering packages:", error);
      return { filteredContent: htmlContent, packageContent: "" };
    }
  };

  // Function to restore packages to content before saving
  const restorePackagesToContent = (filteredContent: string) => {
    if (!filteredContent || !hiddenPackages) return filteredContent;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(filteredContent, "text/html");
      const packageDoc = parser.parseFromString(
        `<div>${hiddenPackages}</div>`,
        "text/html"
      );

      // Find all package placeholders
      const placeholders = doc.querySelectorAll(".package-placeholder");
      console.log(
        `Found ${placeholders.length} package placeholders to restore`
      );

      // Get all the stored package blocks
      const packageWrappers = packageDoc.querySelectorAll(".package-wrapper");
      console.log(`Found ${packageWrappers.length} package blocks to restore`);

      // Map packages by their index for easy access
      const packageMap = new Map();
      packageWrappers.forEach((wrapper) => {
        const index = wrapper.getAttribute("data-package-index");
        if (index) {
          // Get the actual package inside the wrapper
          const packageContent = wrapper.firstElementChild;
          if (packageContent) {
            packageMap.set(index, {
              element: packageContent,
              path: wrapper.getAttribute("data-path"),
            });
          }
        }
      });

      // Track if any packages were successfully restored at their placeholders
      let packagesRestoredAtPlaceholders = false;

      // If we found placeholders, replace them with the corresponding package blocks
      if (placeholders.length > 0) {
        placeholders.forEach((placeholder) => {
          const index = placeholder.getAttribute("data-package-index") || "0";
          const packageData = packageMap.get(index);

          if (packageData && packageData.element) {
            placeholder.parentNode?.replaceChild(
              packageData.element.cloneNode(true),
              placeholder
            );
            packagesRestoredAtPlaceholders = true;
          }
        });
      }

      // If no placeholders were found or some packages couldn't be matched to placeholders,
      // try to restore them at their original position using path information
      if (
        !packagesRestoredAtPlaceholders ||
        packageWrappers.length > placeholders.length
      ) {
        const restoredIndices = new Set();

        // Go through each package and try to place it at its original location
        packageWrappers.forEach((wrapper) => {
          const index = wrapper.getAttribute("data-package-index");
          if (index && !restoredIndices.has(index)) {
            const pathData = wrapper.getAttribute("data-path");
            const packageContent = wrapper.firstElementChild;

            if (pathData && packageContent) {
              try {
                const path = JSON.parse(pathData);

                // Start from the document body
                let currentElement: Element | null = doc.body;

                // Follow the path to find the exact insertion point
                for (let i = 0; i < path.length && currentElement; i++) {
                  const pathItem = path[i];
                  const { tag, position } = pathItem;

                  // Make sure we're at the expected element type
                  if (currentElement.nodeName === tag) {
                    // If this is the last step in the path, we insert before the element at position
                    if (i === path.length - 1) {
                      const children = Array.from(currentElement.children);

                      if (position < children.length) {
                        // Insert before the element at the specified position
                        currentElement.insertBefore(
                          packageContent.cloneNode(true),
                          children[position]
                        );
                        restoredIndices.add(index);
                        console.log(
                          `Restored package at original path position: ${position} in ${tag}`
                        );
                      } else {
                        // Position is beyond current children, append to the end
                        currentElement.appendChild(
                          packageContent.cloneNode(true)
                        );
                        restoredIndices.add(index);
                        console.log(
                          `Appended package to ${tag} as original position ${position} was beyond current children`
                        );
                      }
                    } else {
                      // Move to the next level in the path
                      const children = Array.from(
                        currentElement.children
                      ) as any;
                      if (position < children.length) {
                        currentElement = children[position];
                      } else {
                        // Path is invalid, break out
                        console.warn(
                          `Path navigation failed: position ${position} does not exist in ${tag}`
                        );
                        currentElement = null;
                      }
                    }
                  } else {
                    console.warn(
                      `Path navigation failed: expected ${tag} but found ${currentElement.nodeName}`
                    );
                    currentElement = null;
                  }
                }
              } catch (pathError) {
                console.error("Error processing path data:", pathError);
              }
            }
          }
        });

        // For any packages that couldn't be placed at their original position,
        // append them to the end of the document
        packageWrappers.forEach((wrapper) => {
          const index = wrapper.getAttribute("data-package-index");
          if (index && !restoredIndices.has(index)) {
            const packageContent = wrapper.firstElementChild;
            if (packageContent) {
              doc.body.appendChild(packageContent.cloneNode(true));
              console.log(
                `Appended package with index ${index} to the end as fallback`
              );
            }
          }
        });
      }

      return doc.body.innerHTML;
    } catch (error) {
      console.error("Error restoring packages:", error);
      return filteredContent;
    }
  };

  // Add this function to remove a package block from content
  const removePackageBlockFromContent = (packageId: string) => {
    if (!modalContentRef.current) {
      console.error("Modal content reference is null");
      return;
    }

    try {
      console.log(`Attempting to remove package with ID: ${packageId}`);

      // Create a new DOM representation of the current content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = modalContent;

      // Get the index from the package ID
      const idParts = packageId.split("-");
      const packageType = idParts[1]; // 'explicit' or 'container'
      const packageIndex = parseInt(idParts[2]);

      if (isNaN(packageIndex)) {
        console.error("Invalid package index in ID:", packageId);
        return;
      }

      // Find all relevant elements based on the package type
      let targetElements;
      if (packageType === "explicit") {
        targetElements = tempDiv.querySelectorAll(
          '.packages-block, [data-editor-block="package-cards"]'
        );
      } else {
        // For container type, find horizontal scroll containers
        const scrollContainers = tempDiv.querySelectorAll(
          'div[style*="overflow-x: auto"][style*="white-space: nowrap"]'
        );

        // Filter to only those that look like package containers
        targetElements = Array.from(scrollContainers).filter((container) => {
          const cardElements = container.querySelectorAll(
            'div[style*="border-radius"][style*="overflow: hidden"]'
          );
          return cardElements.length > 0;
        });
      }

      console.log(
        `Found ${targetElements.length} potential package blocks to remove from`
      );

      // Check if the index is valid
      if (packageIndex >= 0 && packageIndex < targetElements.length) {
        // Get and remove the package block
        const elementToRemove = targetElements[packageIndex];
        console.log(`Removing package block:`, elementToRemove);
        elementToRemove.remove();

        // Update the modal content
        setModalContent(tempDiv.innerHTML);

        // Update the existingPackageBlocks state
        setExistingPackageBlocks((prev) =>
          prev.filter((pkg) => pkg.id !== packageId)
        );

        // Rescan the content to ensure accurate package display
        setTimeout(() => {
          scanContentForPackages(tempDiv.innerHTML);
        }, 50);

        toast({
          title: "Success",
          description: "Package block removed from content",
        });
      } else {
        console.warn(
          `Package index ${packageIndex} out of range (0-${
            targetElements.length - 1
          })`
        );
        toast({
          title: "Warning",
          description: "Could not locate the package block to remove",
        });
      }
    } catch (error) {
      console.error("Error removing package block:", error);
      toast({
        title: "Error",
        description: "Failed to remove package block",
        variant: "destructive",
      });
    }
  };

  const insertDummyHtmlBlock = () => {
    if (modalContentRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (modalContentRef.current.contains(range.commonAncestorContainer)) {
          // Insert at the exact cursor position using range
          const dummyHtml = `
            <div class="dummy-html-block" style="border: 2px dashed #0070f3; padding: 15px; margin: 15px 0; background-color: #f5f5f5; position: relative;">
              <button onclick="this.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; background: #ff4d4f; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;">×</button>
              <h3>Dummy HTML Block</h3>
              <p>This is a placeholder block that you can customize.</p>
            </div>
          `;

          // Create a document fragment with the HTML content
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = dummyHtml.trim();
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }

          // Delete any current selection and insert the fragment
          range.deleteContents();
          range.insertNode(fragment);

          // Get the updated content from the contentEditable div
          setModalContent(modalContentRef.current.innerHTML);

          toast({
            title: "Success",
            description: "HTML block inserted at cursor position",
          });
        }
      }
    }
  };

  const insertPackageBlockAtCursor = () => {
    if (!packages.length) {
      toast({
        title: "Error",
        description: "Please add packages first",
        variant: "destructive",
      });
      return;
    }

    if (modalContentRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (modalContentRef.current.contains(range.commonAncestorContainer)) {
          // Create HTML for the packages block with a unique ID to help track it
          const uniqueId = `pkg-${Date.now()}`;
          const insertionTime = Date.now();
          const packagesHtml = `
            <div class="packages-block" data-editor-block="package-cards" data-package-id="${uniqueId}" data-insertion-time="${insertionTime}" style="position: relative; overflow: hidden; margin: 15px 0;">
              <button class="editor-only-element" onclick="this.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; background: #ff4d4f; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; z-index: 10;">×</button>
              <div style="overflow-x: auto; white-space: nowrap; padding: 10px 0; width: 100%; -webkit-overflow-scrolling: touch;">
                <div style="display: inline-flex; gap: 16px; padding: 0 4px;">
                  ${packages
                    .map(
                      (pkg) => `
                  <div style="display: inline-block; vertical-align: top; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); width: 280px; background: white;" data-package-item-id="${pkg.id}">
                    <div style="height: 180px; overflow: hidden; position: relative; background-color: #f3f4f6;">
                      <img src="/images/package.svg" alt="${
                        pkg.name
                      }" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    </div>
                    <div style="padding: 16px 20px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.3; white-space: normal;">
                        ${pkg.name}
                      </h3>
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; white-space: normal;">
                        <span style="display: inline-block; font-size: 12px; color: #4b5563;">Resorts</span>
                        <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                        <span style="display: inline-block; font-size: 12px; color: #4b5563;">Clubs</span>
                        <span style="display: inline-block; font-size: 12px; color: #4b5563;">•</span>
                        <span style="display: inline-block; font-size: 12px; color: #4b5563;">Beach</span>
                      </div>
                      <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px; white-space: normal;">
                        Weekend getaway
                      </div>
                      <div style="font-weight: 600; font-size: 14px; color: #111827; white-space: normal;">
                        From ₹${
                          pkg.starting_price
                            ? pkg.starting_price.toLocaleString()
                            : "29,000"
                        }
                      </div>
                    </div>
                  </div>
                `
                    )
                    .join("")}
                </div>
              </div>
            </div>
          `;

          // Create a document fragment with the HTML content
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = packagesHtml.trim();
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }

          // Delete any current selection and insert the fragment
          range.deleteContents();
          range.insertNode(fragment);

          // Get the updated content from the contentEditable div
          setModalContent(modalContentRef.current.innerHTML);

          // Update the package blocks - scan for existing packages
          setTimeout(() => {
            if (modalContentRef.current) {
              scanContentForPackages(modalContentRef.current.innerHTML);
            }
          }, 50);

          toast({
            title: "Success",
            description: "Package block inserted at cursor position",
          });
        }
      }
    }
  };

  const openContentModal = () => {
    // When opening the modal, restore packages to the content
    let contentWithPackages = content;

    try {
      // First make sure we have the latest hidden packages
      if (hiddenPackages) {
        console.log(
          "Restoring packages for modal editing, size:",
          hiddenPackages.length
        );
        contentWithPackages = restorePackagesToContent(content);
      } else {
        console.log("No hidden packages found to restore for modal");
      }
    } catch (error) {
      console.error("Error restoring packages for modal:", error);
    }

    setModalContent(contentWithPackages);
    setIsContentModalOpen(true);

    // Scan for existing package blocks when opening the modal
    setTimeout(() => {
      scanContentForPackages(contentWithPackages);
    }, 100);
  };

  const saveModalContent = () => {
    // Clean up editor-only elements before saving
    const cleanedContent = cleanEditorElements(modalContent);

    console.log("Saving modal content and processing packages");

    // Filter out packages again before updating the main editor
    const { filteredContent, packageContent } =
      filterPackagesFromContent(cleanedContent);

    // Update the hidden packages if we found any
    if (packageContent) {
      console.log(
        "Packages found in modal content, saving for later restoration:",
        packageContent.length,
        "bytes"
      );
      setHiddenPackages(packageContent);

      // Log the number of packages found for debugging
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(packageContent, "text/html");
        const packageWrappers = doc.querySelectorAll(".package-wrapper");
        console.log(`Found ${packageWrappers.length} package wrappers to save`);

        // Examine path data for each package to ensure location information is preserved
        packageWrappers.forEach((wrapper, idx) => {
          const pathData = wrapper.getAttribute("data-path");
          if (pathData) {
            try {
              const path = JSON.parse(pathData);
              console.log(
                `Package #${idx} has location path with ${path.length} steps`
              );
            } catch (e) {
              console.warn(`Invalid path data for package #${idx}`);
            }
          } else {
            console.warn(`Package #${idx} does not have path data`);
          }
        });
      } catch (error) {
        console.error("Error parsing package content:", error);
      }
    } else {
      console.log("No packages found in modal content");
      // If we had packages before but now have none, preserve the state to allow restoration
      if (hiddenPackages) {
        console.log(
          "Maintaining previous package state since no new packages were found"
        );
      } else {
        setHiddenPackages("");
      }
    }

    // Update the main editor content with the cleaned, filtered content
    setContent(filteredContent);

    // Close the modal
    setIsContentModalOpen(false);

    // Force the editor to sync with the new content
    if (editor?.current) {
      setTimeout(() => {
        editor?.current?.commands?.setContent(filteredContent);
      }, 50);
    }

    toast({
      title: "Success",
      description: "Content updated with your changes",
    });
  };

  const cleanEditorElements = (htmlContent: string): string => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    // Remove all editor-only elements
    const editorElements = tempDiv.querySelectorAll(".editor-only-element");
    editorElements.forEach((el) => el.remove());

    // Remove any styling used only for editing (like borders)
    const editorBlocks = tempDiv.querySelectorAll("[data-editor-block]");
    editorBlocks.forEach((block) => {
      // Keep only essential styling needed for display
      if (block.getAttribute("data-editor-block") === "package-cards") {
        // Ensure the package cards container maintains proper styling
        (block as HTMLElement).style.position = "relative";
        (block as HTMLElement).style.overflow = "hidden";
        (block as HTMLElement).style.margin = "15px 0";
        // Remove any editor-specific attributes
        block.removeAttribute("data-editor-block");
      }
    });

    return tempDiv.innerHTML;
  };

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  const displayedContent =
    outputFormat === "html" ? content : turndownService.turndown(content);

  return (
    <div>
      {!isAuthor &&
        session?.user?.role !== "admin" &&
        session?.user?.role !== "editor" && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You can only edit posts that you have created unless you are an
              admin or editor.
            </AlertDescription>
          </Alert>
        )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Edit Post</h1>
            <p className="text-sm text-muted-foreground">
              Make changes to your post and update its status
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={postStatus}
                onValueChange={(value: "DRAFT" | "PUBLISHED" | "ARCHIVED") =>
                  setPostStatus(value)
                }
                disabled={
                  isLoading ||
                  (!isAuthor &&
                    session?.user?.role !== "admin" &&
                    session?.user?.role !== "editor")
                }
              >
                <SelectTrigger className="w-[180px]" id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (!isAuthor &&
                  session?.user?.role !== "admin" &&
                  session?.user?.role !== "editor")
              }
            >
              {isLoading ? "Saving..." : "Save Post"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            required
          />
        </div>

        {/* SEO Section */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title (for SEO)</Label>
              <Input
                id="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Enter meta title (defaults to post title if empty)"
              />
              <p className="text-xs text-muted-foreground">
                {metaTitle.length} / 60 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">
                Meta Description (for SEO)
              </Label>
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Enter meta description"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {metaDescription.length} / 160 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featureImage">Feature Image</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  onClick={() =>
                    document.getElementById("feature-image-upload")?.click()
                  }
                  variant="outline"
                >
                  Upload Image
                </Button>
                <Input
                  id="feature-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFeatureImageUpload}
                />
                {featureImage && (
                  <div className="flex items-center gap-2">
                    <img
                      src={featureImage}
                      alt={featureImageAlt}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <Button
                      type="button"
                      onClick={() => setFeatureImage("")}
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {featureImage && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="featureImageAlt">
                    Feature Image Alt Text
                  </Label>
                  <Input
                    id="featureImageAlt"
                    value={featureImageAlt}
                    onChange={(e) => setFeatureImageAlt(e.target.value)}
                    placeholder="Describe the image for accessibility"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Content Section */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customTitle">Display Title</Label>
              <Input
                id="customTitle"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter a display title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Enter keywords separated by commas"
              />
            </div>
          </CardContent>
        </Card>

        {/* Most Read Blogs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Most Read Blogs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative" ref={blogSearchRef}>
              <div className="flex items-center border rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search blogs by ID or title..."
                  value={blogSearchTerm}
                  onChange={(e) => handleBlogSearch(e.target.value)}
                  className="flex-1 border-0 bg-transparent p-0 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoadingBlogs}
                />
                {blogSearchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 rounded-full"
                    onClick={() => {
                      setBlogSearchTerm("");
                      setBlogSearchResults([]);
                      setShowBlogSearchResults(false);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {showBlogSearchResults && blogSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover rounded-md border shadow-md max-h-56 overflow-auto">
                  <ul className="py-1">
                    {blogSearchResults.map((blog) => (
                      <li
                        key={blog.id}
                        className="px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                        onClick={() => selectBlogFromSearch(blog)}
                      >
                        <div className="font-medium">
                          {blog.title || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {blog.id}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {selectedBlogDetails.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 mt-4">
                {selectedBlogDetails.map((blog) => (
                  <div
                    key={blog.id}
                    className="relative flex border rounded-md overflow-hidden"
                  >
                    {blog.featureImage && (
                      <div className="w-24 h-auto bg-muted relative">
                        <Image
                          src={blog.featureImage}
                          alt={
                            blog.featureImageAlt || blog.title || "Blog image"
                          }
                          className="object-cover"
                          fill
                        />
                      </div>
                    )}
                    <div className="flex-1 p-3 pl-4">
                      <div className="font-medium line-clamp-1">
                        {blog.title || "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {blog.id}
                      </div>
                      {blog.excerpt && (
                        <p className="text-sm mt-1 line-clamp-2">
                          {blog.excerpt}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full bg-background/80 hover:bg-background"
                      onClick={() => removeRelatedBlog(blog.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                No related blogs selected yet
              </p>
            )}

            <p className="text-xs text-gray-500">
              Add other blog posts that are relevant or most read in relation to
              this post
            </p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label>Content</Label>
          <div className="flex gap-4 mb-4">
            <Button
              type="button"
              onClick={() => setOutputFormat("html")}
              variant={outputFormat === "html" ? "default" : "outline"}
            >
              HTML
            </Button>
            <Button
              type="button"
              onClick={() => setOutputFormat("markdown")}
              variant={outputFormat === "markdown" ? "default" : "outline"}
            >
              Markdown
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Tip:</strong> Double-click on images to edit alt text
          </p>

          <div className="relative">
            <RichTextEditor
              ref={editor}
              output="html"
              content={content}
              onChangeContent={(value) => {
                // First save any existing alt tags from the current content
                const currentAltMap = new Map();
                try {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(content, "text/html");
                  const existingImages = doc.querySelectorAll("img");
                  existingImages.forEach((img) => {
                    const src = img.getAttribute("src") || "";
                    const alt = img.getAttribute("alt") || "";
                    if (src && alt) {
                      currentAltMap.set(src, alt);
                    }
                  });
                } catch (error) {
                  console.error("Error saving current alt tags:", error);
                }

                // Process new value to ensure alt tags are applied
                // Only inject new alt text when there are empty alt attributes
                let processedValue = injectAltText(value);

                // Clean up the image containers to remove ALT badges
                processedValue = cleanImageContainers(processedValue);

                console.log(
                  "Content updated with alt text processing and badge cleanup"
                );

                // Restore any previously set alt tags from the currentAltMap
                try {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(
                    processedValue,
                    "text/html"
                  );
                  const images = doc.querySelectorAll("img");
                  let altUpdated = false;

                  images.forEach((img) => {
                    const src = img.getAttribute("src") || "";
                    if (src && currentAltMap.has(src)) {
                      const savedAlt = currentAltMap.get(src);
                      img.setAttribute("alt", savedAlt);
                      altUpdated = true;
                      console.log(
                        `Restored alt text for ${src} -> "${savedAlt}"`
                      );
                    }
                  });

                  if (altUpdated) {
                    processedValue = doc.body.innerHTML;
                  }
                } catch (error) {
                  console.error("Error restoring alt tags:", error);
                }

                console.log(
                  "Edit page - Content updated with alt text injection"
                );
                setContent(processedValue);

                // After updating content, ensure alt text mapping is synchronized
                // This helps the editor track alt texts properly
                try {
                  setTimeout(() => {
                    // Use a DOM parser to extract all images and their alt text
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(
                      processedValue,
                      "text/html"
                    );
                    const images = doc.querySelectorAll("img");

                    // Manually trigger a custom event to update alt text displays
                    images.forEach((img) => {
                      const altText = img.getAttribute("alt") || "";
                      const src = img.getAttribute("src") || "";
                      if (src) {
                        console.log(
                          `Dispatching alt text update for ${src}: "${altText}"`
                        );
                        const event = new CustomEvent("alttextchanged", {
                          detail: { src, alt: altText },
                        });
                        document.dispatchEvent(event);
                      }
                    });
                  }, 100);
                } catch (error) {
                  console.error("Error synchronizing alt text:", error);
                }
              }}
              extensions={extensions}
              dark={false}
              disabled={isLoading}
            />
          </div>

          <div className="mt-4">
            <Button
              type="button"
              onClick={openContentModal}
              variant="outline"
              className="w-full"
            >
              Insert Holiday Packages Block
            </Button>
          </div>

          <Dialog
            open={isContentModalOpen}
            onOpenChange={setIsContentModalOpen}
          >
            <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Insert HTML Blocks</DialogTitle>
                <DialogDescription>
                  Click anywhere in the content to place your cursor, then click
                  &ldquo;Insert Block&rdquo; to add HTML at that position.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                <div
                  className="md:col-span-2 border rounded-md p-4 overflow-y-auto"
                  style={{ height: "calc(90vh - 250px)" }}
                >
                  <div
                    ref={modalContentRef}
                    className="prose max-w-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    dangerouslySetInnerHTML={{ __html: modalContent }}
                    style={{ minHeight: "300px" }}
                  />
                </div>

                <div
                  className="space-y-4 border rounded-md p-4 overflow-y-auto"
                  style={{ height: "calc(90vh - 250px)" }}
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Insert Blocks</h3>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Holiday Packages Block
                        </h4>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter package ID"
                              value={packageInput}
                              onChange={(e) => setPackageInput(e.target.value)}
                            />
                            <Button
                              type="button"
                              onClick={addPackage}
                              disabled={isLoadingPackages}
                              size="sm"
                            >
                              {isLoadingPackages ? "..." : "Add"}
                            </Button>
                          </div>

                          {packages.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">
                                {packages.length} packages ready to insert
                              </p>
                              <Button
                                type="button"
                                onClick={insertPackageBlockAtCursor}
                                size="sm"
                                className="w-full"
                              >
                                Insert Packages Block
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section to display and manage existing package blocks */}
                      {existingPackageBlocks.length > 0 && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="text-sm font-medium mb-2">
                            Existing Package Blocks (
                            {existingPackageBlocks.length})
                          </h4>
                          <div className="space-y-2 max-h-[150px] overflow-y-auto border border-muted rounded-md p-2">
                            {existingPackageBlocks.map((pkg, index) => (
                              <div
                                key={pkg.id}
                                className="flex items-center justify-between p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                              >
                                <span className="text-xs truncate flex-1">
                                  Package Block #{index + 1}
                                </span>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    removePackageBlockFromContent(pkg.id)
                                  }
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 px-2"
                                >
                                  Delete
                                </Button>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Delete existing package blocks from the content.
                            These blocks will be hidden in the main editor.
                          </p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Dummy HTML Block
                        </h4>
                        <Button
                          type="button"
                          onClick={insertDummyHtmlBlock}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Insert Dummy Block
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsContentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={saveModalContent}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table of Contents Section */}
        <Card>
          <CardHeader>
            <CardTitle>Table of Contents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Edit</TabsTrigger>
                <TabsTrigger value="auto">Auto Generate</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New section title"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={addSection}
                    variant="outline"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Section
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  <Accordion type="multiple" className="w-full">
                    {tableOfContents.sections.map((section, index) => (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="px-3 hover:bg-muted/50 rounded-md group">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex-1">
                              {editingSectionId === section.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingTitle}
                                    onChange={(e) =>
                                      setEditingTitle(e.target.value)
                                    }
                                    autoFocus
                                    className="py-1 h-8"
                                  />
                                  <Button
                                    type="button"
                                    onClick={saveEditingSection}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Save
                                  </Button>
                                </div>
                              ) : (
                                <span>{section.title}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingSection(
                                    section.id,
                                    section.title
                                  );
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveSection(section.id, "up");
                                }}
                                disabled={index === 0}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoveUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveSection(section.id, "down");
                                }}
                                disabled={
                                  index === tableOfContents.sections.length - 1
                                }
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoveDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSection(section.id);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-4 pt-2">
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <Input
                                placeholder="New subsection title"
                                value={
                                  currentSectionId === section.id
                                    ? newSubsectionTitle
                                    : ""
                                }
                                onChange={(e) => {
                                  setCurrentSectionId(section.id);
                                  setNewSubsectionTitle(e.target.value);
                                }}
                              />
                              <Button
                                type="button"
                                onClick={() => addSubsection(section.id)}
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add Subsection
                              </Button>
                            </div>

                            <div className="space-y-2 ml-4 mt-2">
                              {section.subsections.map(
                                (subsection, subIndex) => (
                                  <div
                                    key={subsection.id}
                                    className="flex items-center justify-between gap-2 p-2 border rounded-md hover:bg-muted/30 group"
                                  >
                                    {editingSubsectionId === subsection.id ? (
                                      <div className="flex-1 flex items-center gap-2">
                                        <Input
                                          value={editingTitle}
                                          onChange={(e) =>
                                            setEditingTitle(e.target.value)
                                          }
                                          autoFocus
                                          className="py-1 h-8"
                                        />
                                        <Button
                                          type="button"
                                          onClick={() =>
                                            saveEditingSubsection(section.id)
                                          }
                                          variant="outline"
                                          size="sm"
                                        >
                                          Save
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="flex-1">
                                        {subsection.title}
                                      </span>
                                    )}

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          startEditingSubsection(
                                            subsection.id,
                                            subsection.title
                                          )
                                        }
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          moveSubsection(
                                            section.id,
                                            subsection.id,
                                            "up"
                                          )
                                        }
                                        disabled={subIndex === 0}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                      >
                                        <MoveUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          moveSubsection(
                                            section.id,
                                            subsection.id,
                                            "down"
                                          )
                                        }
                                        disabled={
                                          subIndex ===
                                          section.subsections.length - 1
                                        }
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                      >
                                        <MoveDown className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          removeSubsection(
                                            section.id,
                                            subsection.id
                                          )
                                        }
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {tableOfContents.sections.length === 0 && (
                    <div className="text-center p-4 border rounded-md bg-muted/20">
                      <p className="text-muted-foreground">
                        No sections added yet. Add a section above or generate
                        from content.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="auto" className="space-y-4 mt-4">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Automatically generate a table of contents from your content
                    headings. This will scan for H1, H2, H3, etc. tags in your
                    content and create sections and subsections accordingly.
                  </p>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={generateTableOfContents}
                      variant="default"
                    >
                      Generate from Content
                    </Button>

                    {tableOfContents.sections.length > 0 && (
                      <Button
                        type="button"
                        onClick={() => setTableOfContents({ sections: [] })}
                        variant="outline"
                      >
                        Clear Table of Contents
                      </Button>
                    )}
                  </div>

                  {tableOfContents.sections.length > 0 && (
                    <div className="mt-4 border rounded-md p-4">
                      <h3 className="text-sm font-medium mb-4">Preview:</h3>
                      <div className="space-y-3">
                        {tableOfContents.sections.map((section) => (
                          <div key={section.id} className="space-y-2">
                            <div className="font-medium">{section.title}</div>
                            {section.subsections.length > 0 && (
                              <ul className="ml-6 list-disc space-y-1">
                                {section.subsections.map((subsection) => (
                                  <li key={subsection.id} className="text-sm">
                                    {subsection.title}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-xs text-gray-500 mt-2">
              <p>
                The table of contents will be saved separately and can be
                displayed on the frontend. Clicking on sections will reveal
                subsections.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alt Text Manager Button */}
        <div className="mt-4 mb-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAltTextManager(!showAltTextManager)}
            className="mb-2"
          >
            {showAltTextManager ? "Hide" : "Show"} Alt Text Manager (
            {imageAltMap.size} images)
          </Button>

          {showAltTextManager && (
            <div className="border rounded-md p-4 space-y-4 bg-muted/50 mt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Image Alt Text Manager</h3>
                <Button type="button" size="sm" onClick={updateAllAltTexts}>
                  Apply All Changes
                </Button>
              </div>

              {Array.from(imageAltMap.entries()).length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {Array.from(imageAltMap.entries()).map(
                    ([src, alt], index) => (
                      <div
                        key={src}
                        className="flex flex-col space-y-2 border-b pb-3"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-24 h-24 relative flex-shrink-0 border rounded overflow-hidden">
                            <img
                              src={src}
                              alt={alt || "Image preview"}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`alt-text-${index}`}>
                              Alt Text for Image {index + 1}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`alt-text-${index}`}
                                value={alt}
                                onChange={(e) => {
                                  const newMap = new Map(imageAltMap);
                                  newMap.set(src, e.target.value);
                                  setImageAltMap(newMap);
                                }}
                                placeholder="Describe this image..."
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  // Apply this single change immediately
                                  const newMap = new Map(imageAltMap);
                                  const currentAlt = newMap.get(src) || "";

                                  // Dispatch event for global syncing
                                  const event = new CustomEvent(
                                    "alttextchanged",
                                    {
                                      detail: { src, alt: currentAlt },
                                    }
                                  );
                                  document.dispatchEvent(event);

                                  toast({
                                    title: "Updated",
                                    description: "Alt text applied to image",
                                  });
                                }}
                              >
                                ✓
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {src.split("/").pop()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No images found in content
                </p>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default function EditPostPage() {
  return (
    <RoleGate allowedRoles={["admin", "editor", "author"]} requireActive={true}>
      <EditPostContent />
    </RoleGate>
  );
}
