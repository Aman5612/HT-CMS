"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import nextDynamic from "next/dynamic";
import TurndownService from "turndown";
import { injectAltText } from "@/app/extensions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, MoveUp, MoveDown, X, Search } from "lucide-react";
import "@/app/editor.css"; // Import custom editor styles
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface RichTextEditorProps {
  editorRef?: React.RefObject<any>;
  output?: "html" | "markdown";
  content: string;
  onChangeContent: (value: string) => void;
  extensions: any[];
  dark?: boolean;
  disabled?: boolean;
  defaultFontFamily?: string;
}

const RichTextEditor = nextDynamic(
  () =>
    import("reactjs-tiptap-editor").then((mod) => {
      const Component = mod.default;
      return {
        // eslint-disable-next-line react/display-name
        default: React.forwardRef<any, RichTextEditorProps>((props, ref) => {
          const safeProps = {
            ...props,
            output:
              props.output === "markdown" ? "html" : props.output || "html",
            defaultFontFamily: props.defaultFontFamily || "DM Sans",
          };
          return <Component {...safeProps} ref={ref} />;
        }),
      };
    }),
  { ssr: false }
);

export default function NewPostPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [featureImage, setFeatureImage] = useState("");
  const [featureImageAlt, setFeatureImageAlt] = useState("");
  const [outputFormat, setOutputFormat] = useState<"html" | "markdown">("html");
  const [isLoading, setIsLoading] = useState(false);
  const [extensions, setExtensions] = useState<any[]>([]);
  const [postStatus, setPostStatus] = useState<
    "DRAFT" | "PUBLISHED" | "ARCHIVED"
  >("DRAFT");
  const editor = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [packageIds, setPackageIds] = useState<string[]>([]);
  const [packageInput, setPackageInput] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [manualId, setManualId] = useState("");
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
  const turndownService = new TurndownService();

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

  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const [imageAspectRatioWarning, setImageAspectRatioWarning] = useState<
    string | null
  >(null);

  useEffect(() => {
    import("@/app/extensions").then((mod) => {
      setExtensions(mod.extensions);
    });

    // Fetch available blogs when component mounts
    fetchBlogs();
  }, []);

  turndownService.addRule("images", {
    filter: "img",
    replacement: (content: string, node: any) => {
      const alt = node.getAttribute("alt") || "";
      const src = node.getAttribute("src");
      return `![${alt}](${src})`;
    },
  });

  turndownService.addRule("cardBlock", {
    filter: (node: any) =>
      node.nodeName === "DIV" &&
      node.getAttribute("data-type") === "card-block",
    replacement: (_content: any, node: any) => {
      const cardId = node.getAttribute("data-card-id");
      return `[Card Block ID: ${cardId}]`;
    },
  });

  const insertCardBlock = () => {
    if (typeof window !== "undefined" && editor.current) {
      const cardId = prompt("Enter Card ID:");
      if (cardId) {
        editor.current.commands.insertCardBlock({ cardId, position: 0 });
      }
    }
  };

  const handleFeatureImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check image aspect ratio before uploading
    const checkAspectRatio = () => {
      return new Promise<void>((resolve) => {
        // Create image element for checking dimensions
        const img = document.createElement("img");

        img.onload = () => {
          const aspectRatio = img.width / img.height;
          console.log("Image dimensions:", img.width, "x", img.height);
          console.log("Aspect ratio:", aspectRatio);

          // Check if aspect ratio is NOT close to 2:1 with a wider tolerance
          if (Math.abs(aspectRatio - 2) > 0.2) {
            console.log("Aspect ratio not 2:1, showing warning");
            const warningMessage = `Image aspect ratio is ${aspectRatio.toFixed(
              2
            )}. For best results, use an image with aspect ratio of 2:1.`;
            setImageAspectRatioWarning(warningMessage);
            // Still show toast but also keep persistent warning
            toast({
              title: "Aspect Ratio Warning",
              description: warningMessage,
              variant: "destructive",
            });
          } else {
            console.log(
              "Aspect ratio is acceptable (close to 2:1):",
              aspectRatio
            );
            setImageAspectRatioWarning(null);
          }

          // Clean up object URL
          URL.revokeObjectURL(img.src);
          resolve();
        };

        // Handle any errors
        img.onerror = () => {
          console.error("Error loading image for aspect ratio check");
          URL.revokeObjectURL(img.src);
          resolve(); // Still resolve to continue with upload
        };

        // Set the source to trigger loading
        const objectUrl = URL.createObjectURL(file);
        console.log("Created object URL for image:", objectUrl);
        img.src = objectUrl;
      });
    };

    try {
      // Check aspect ratio before proceeding
      await checkAspectRatio();

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

      const response = await fetch("/blog-cms/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Feature image upload failed");
      const { url } = await response.json();

      console.log("Feature image uploaded successfully to:", url);
      setFeatureImage(url);
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
      const imageUploadButton = document.getElementById(
        "featureImageUploadBtn"
      );
      if (imageUploadButton) {
        imageUploadButton.textContent = "Upload Image";
        imageUploadButton.removeAttribute("disabled");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchPackage = async (packageId: string) => {
    try {
      setIsLoadingPackages(true);
      const response = await fetch(
        `https://holidaytribe.com:3000/package/getPackageByIds/${packageId}`
      );
      if (!response.ok) throw new Error("Failed to fetch package");

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
      return false;
    } catch (error) {
      console.error("Error fetching package:", error);
      toast({
        title: "Error",
        description: "Failed to fetch package data",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const addPackage = async () => {
    if (!packageInput.trim()) return;

    // Check if already added
    if (packageIds.includes(packageInput)) {
      toast({
        title: "Already added",
        description: "This package ID is already in the list",
      });
      return;
    }

    const success = await fetchPackage(packageInput);
    if (success) {
      setPackageIds((prev) => [...prev, packageInput]);
      setPackageInput("");
    }
  };

  const removePackage = async (packageId: string) => {
    setPackageIds((prev) => prev.filter((id) => id !== packageId));
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
    editor.current.commands.insertContent(packagesHtml);

    toast({
      title: "Success",
      description: "Packages inserted into content",
    });
  };

  const fetchBlogs = async () => {
    try {
      setIsLoadingBlogs(true);
      const response = await fetch("/blog-cms/api/posts");
      if (!response.ok) throw new Error("Failed to fetch blogs");

      const data = await response.json();
      console.log("Fetched blogs:", data);

      if (data && Array.isArray(data.posts)) {
        setAvailableBlogs(data.posts);
      } else if (data && Array.isArray(data)) {
        setAvailableBlogs(data);
      } else {
        console.error("Unexpected API response format:", data);
        toast({
          title: "Error",
          description: "Unexpected API response format",
          variant: "destructive",
        });
      }
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

  const cleanImageContainers = (htmlContent: string) => {
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Find all image-alt-badge spans and remove them
    const altBadges = doc.querySelectorAll(".image-alt-badge");
    altBadges.forEach((badge) => {
      badge.remove();
    });

    // Return the processed HTML
    return new XMLSerializer().serializeToString(doc);
  };

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

  const openContentModal = () => {
    setModalContent(content);
    setIsContentModalOpen(true);
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
          // Create HTML for the packages block
          const packagesHtml = `
            <div class="packages-block" data-editor-block="package-cards" style="position: relative; overflow: hidden; margin: 15px 0;">
              <button class="editor-only-element" onclick="this.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; background: #ff4d4f; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; z-index: 10;">×</button>
              <div style="overflow-x: auto; white-space: nowrap; padding: 10px 0; width: 100%; -webkit-overflow-scrolling: touch;">
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

          // Clear the packages list to allow creating a new block with different packages
          setPackages([]);
          setPackageIds([]);
          setPackageInput("");

          toast({
            title: "Success",
            description: "Package block inserted at cursor position",
          });
        }
      }
    }
  };

  // Function to clean up editor-only elements before saving
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

  const saveModalContent = () => {
    // Clean up editor-only elements before saving
    const cleanedContent = cleanEditorElements(modalContent);

    // Update the main editor content with the cleaned content
    setContent(cleanedContent);

    // Close the modal
    setIsContentModalOpen(false);

    // Force the editor to sync with the new content
    if (editor.current) {
      setTimeout(() => {
        editor.current.commands.setContent(cleanedContent);
      }, 50);
    }

    toast({
      title: "Success",
      description: "Content updated with your changes",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sessionStatus === "loading") return;
    if (!session?.user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a post",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    if (!manualId) {
      toast({
        title: "Error",
        description: "Please enter a custom ID",
        variant: "destructive",
      });
      return;
    }

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
      // Get the latest content directly from the editor if available
      let latestContent = content;
      if (editor.current) {
        try {
          // Try to get the latest HTML content from the editor
          latestContent = editor.current.getHTML();
        } catch (editorError) {
          console.warn("Could not get HTML from editor:", editorError);
          // Fall back to the state content
        }
      }

      // Process content to ensure alt tags are properly set but preserve custom blocks
      const processedContent = injectAltText(latestContent);

      // Extract images from content
      const parser = new DOMParser();
      const doc = parser.parseFromString(processedContent, "text/html");
      const images = doc.querySelectorAll("img");

      const mediaItems = Array.from(images).map((img) => {
        return {
          url: img.src,
          type: "image",
          alt: img.alt || "",
        };
      });

      // Find all card blocks in the content
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

      // Generate a slug from the title
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-");

      // Ensure authors can only create draft posts
      let finalStatus = postStatus;
      if (session.user.role === "author") {
        finalStatus = "DRAFT";
      }

      // Handle markdown conversion if needed
      let finalContent = processedContent;
      if (outputFormat === "markdown") {
        finalContent = turndownService.turndown(processedContent);
      }

      // Create the post via API
      const response = await fetch("/blog-cms/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content: finalContent,
          slug,
          excerpt: metaDescription || finalContent.substring(0, 157) + "...",
          authorId: session.user.id,
          metaTitle: metaTitle || title,
          metaDescription,
          featureImage,
          featureImageAlt,
          media: mediaItems,
          cardBlocks,
          packageIds,
          manualId, // Send manual ID to be used as primary key
          status: finalStatus,
          customTitle,
          keywords,
          relatedBlogIds, // Add the related blog IDs to the request
          tableOfContents, // Add the table of contents to the request
        }),
      });

      // Read the response first - but don't await it twice
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        // Extract meaningful error message from various formats
        let errorMessage = "Failed to create post";
        let errorDetail = "";
        console.error("API Error Response:", data);

        if (data) {
          if (typeof data.error === "string") {
            // If it's a simple string error
            errorMessage = data.error;
          }

          // Check for the structured errorDetail from our updated API
          if (data.errorDetail) {
            const detail = data.errorDetail;

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
          } else if (data.error && typeof data.error !== "string") {
            // Fallback for other error formats
            const errorStr = JSON.stringify(data.error);
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
              errorMessage = "Creation failed";
              errorDetail = errorStr.substring(0, 100); // Limit length for toast
            }
          }
        }

        console.log("SHOWING ERROR TOAST:", { errorMessage, errorDetail });
        toast({
          title: "Error",
          description: errorDetail
            ? `${errorMessage}: ${errorDetail}`
            : errorMessage,
          variant: "destructive",
        });
        console.log("TOAST WAS CALLED");

        // Store that we showed the toast to prevent duplicates
        window._toastShown = true;

        throw new Error(errorMessage);
      }

      toast({
        title: "Success",
        description: "Post created successfully",
      });

      // Redirect to posts list
      router.push("/dashboard/posts");
    } catch (error) {
      console.error("Error creating post:", error);

      // Don't show another toast if we already showed one for the API error
      if (!(typeof window !== "undefined" && (window as any)._toastShown)) {
        console.log("SHOWING CATCH ERROR TOAST");
        toast({
          title: "Error",
          description: (error as Error).message || "Failed to create post",
          variant: "destructive",
        });
        console.log("CATCH TOAST WAS CALLED");
      } else {
        console.log("SUPPRESSING DUPLICATE TOAST");
      }
    } finally {
      if (typeof window !== "undefined") {
        // Reset the flag
        (window as any)._toastShown = false;
      }
      setIsLoading(false);
    }
  };

  if (sessionStatus === "loading") {
    return <div>Loading...</div>;
  }

  if (extensions.length === 0) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Post</h1>
        <Button onClick={() => router.push("/dashboard/posts")}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="my-4 border shadow-sm">
          <CardHeader>
            <CardTitle>Post ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manualId">Custom ID</Label>
              <Input
                id="manualId"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Enter a custom ID"
                required
              />
              <p className="text-xs text-gray-500">
                This ID will be used as the primary identifier for the post and
                cannot be changed later
              </p>
            </div>
          </CardContent>
        </Card>

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

        <Card className="my-4 border shadow-sm">
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
              <p className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500">
                {metaDescription.length} / 160 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featureImage">Feature Image</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  id="featureImageUploadBtn"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Upload Image
                </Button>
                <input
                  type="file"
                  id="featureImage"
                  ref={fileInputRef}
                  onChange={handleFeatureImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                {featureImage && (
                  <span className="text-sm text-gray-500">Image uploaded</span>
                )}
              </div>

              {featureImage && (
                <div className="mt-4 space-y-4">
                  <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border">
                    <Image
                      src={featureImage}
                      alt={featureImageAlt}
                      className="object-cover"
                      fill
                    />
                  </div>

                  {imageAspectRatioWarning && (
                    <p className="text-sm font-medium text-red-500">
                      ⚠️ {imageAspectRatioWarning}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="featureImageAlt">Image Alt Text</Label>
                    <Input
                      id="featureImageAlt"
                      value={featureImageAlt}
                      onChange={(e) => setFeatureImageAlt(e.target.value)}
                      placeholder="Describe the image for accessibility"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="my-4 border shadow-sm">
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

        <Card className="my-4 border shadow-sm">
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

            {selectedBlogDetails.length > 0 && (
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
          <RichTextEditor
            editorRef={editor}
            output="html"
            content={content}
            onChangeContent={(value: string) => {
              // First process with the existing injectAltText function
              let processedValue = injectAltText(value);
              // Then clean up the image containers to remove ALT badges
              processedValue = cleanImageContainers(processedValue);
              console.log(
                "Content updated with alt text processing and badge cleanup"
              );
              setContent(processedValue);
            }}
            extensions={extensions}
            dark={false}
            disabled={isLoading}
            defaultFontFamily="DM Sans"
          />

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

                          {packageIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {packageIds.map((id) => (
                                <div
                                  key={id}
                                  className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs"
                                >
                                  <span>{id}</span>
                                  <button
                                    type="button"
                                    onClick={() => removePackage(id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <span className="sr-only">Remove</span>×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

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
        <Card className="my-4 border shadow-sm">
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

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={postStatus}
            onValueChange={(value: any) =>
              setPostStatus(value as "DRAFT" | "PUBLISHED" | "ARCHIVED")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
              <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
