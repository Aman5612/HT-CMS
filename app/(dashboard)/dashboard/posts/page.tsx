"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  Plus,
  FileText,
  Search,
  Grid,
  List,
  Eye,
  Edit,
  Trash2,
  Clock,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function PostsPage() {
  return (
    <RoleGate allowedRoles={["admin", "editor", "author"]} requireActive={true}>
      <PostsContent />
    </RoleGate>
  );
}

function PostsContent() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [postToChangeStatus, setPostToChangeStatus] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // Add pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false
  });

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // Build query parameters for pagination and title search
      const params = new URLSearchParams();
      params.append('page', pagination.currentPage.toString());
      params.append('limit', pagination.limit.toString());
      
      // Add title search if exists
      if (titleSearch) {
        params.append('title', titleSearch);
      }
      
      const response = await fetch(`/blog-cms/api/posts?${params.toString()}`);
      const data = await response.json();

      // Handle new response structure with data and pagination
      const postsArray = Array.isArray(data.data) ? data.data : [];
      
      // Update pagination state
      if (data.pagination) {
        setPagination(data.pagination);
      }

      // Filter posts based on user role
      let filteredPosts = postsArray;

      // If user is an author, only show their posts
      if (session?.user?.role === "author" && session?.user?.id) {
        filteredPosts = postsArray.filter(
          (post: any) => post.authorId === session.user.id
        );
      }

      // Apply status filter if not "all"
      if (statusFilter !== "all") {
        filteredPosts = filteredPosts.filter(
          (post: any) => post.status === statusFilter
        );
      }

      // Apply search filter for author name (client-side filtering)
      if (search) {
        const searchLower = search.toLowerCase();
        filteredPosts = filteredPosts.filter(
          (post: any) =>
            (post.author?.name &&
              post.author.name.toLowerCase().includes(searchLower))
        );
      }

      setPosts(filteredPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch posts",
        variant: "destructive",
      });
      // Set posts to empty array on error
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [pagination.currentPage, pagination.limit, titleSearch, statusFilter, search, session]);

  // Add handler for title search
  const handleTitleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on new search
    fetchPosts();
  };

  // Add pagination handlers
  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage) {
      setPagination(prev => ({
        ...prev,
        currentPage: prev.currentPage - 1
      }));
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setPagination(prev => ({
        ...prev,
        currentPage: prev.currentPage + 1
      }));
    }
  };

  const handlePageSizeChange = (value: string) => {
    setPagination(prev => ({
      ...prev,
      limit: parseInt(value, 10),
      currentPage: 1 // Reset to first page when changing page size
    }));
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      const response = await fetch(`/blog-cms/api/posts/${postToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      setPosts(posts.filter((post) => post.id !== postToDelete));
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    } finally {
      setPostToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleStatusChange = async () => {
    if (!postToChangeStatus || !newStatus) return;

    try {
      const response = await fetch(`/bog-cms/api/posts/${postToChangeStatus.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          title: postToChangeStatus.title,
          content: postToChangeStatus.content || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update post status");
      }

      // Update the post in the local state
      setPosts(
        posts.map((post) =>
          post.id === postToChangeStatus.id
            ? { ...post, status: newStatus }
            : post
        )
      );

      toast({
        title: "Success",
        description: "Post status updated successfully",
      });
    } catch (error) {
      console.error("Error updating post status:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update post status",
        variant: "destructive",
      });
    } finally {
      setPostToChangeStatus(null);
      setNewStatus("");
      setShowStatusDialog(false);
    }
  };

  const handleNewPost = () => {
    router.push("/dashboard/posts/new");
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/posts/${id}/edit`);
  };

  const handleView = (slug: string) => {
    window.open(`https://test.holidayer.in/ht-blogs/blog/${slug}`, "_blank");
  };

  const openStatusChangeDialog = (post: any) => {
    setPostToChangeStatus(post);
    setNewStatus(post.status);
    setShowStatusDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "PUBLISHED":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    }
  };

  const getStatusBadge = (
    status: string,
    clickable = false,
    post: any = null
  ) => {
    const baseClasses = {
      DRAFT: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      PUBLISHED: "bg-green-100 text-green-800 hover:bg-green-100",
      ARCHIVED: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };

    const statusText = {
      DRAFT: "Draft",
      PUBLISHED: "Published",
      ARCHIVED: "Archived",
    };

    const className =
      baseClasses[status as keyof typeof baseClasses] ||
      "bg-blue-100 text-blue-800 hover:bg-blue-100";
    const displayText = statusText[status as keyof typeof statusText] || status;

    if (clickable && post) {
      return (
        <Badge
          variant="outline"
          className={`${className} cursor-pointer transition-all hover:scale-105`}
          onClick={() => openStatusChangeDialog(post)}
        >
          {displayText}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={className}>
        {displayText}
      </Badge>
    );
  };

  // Function to extract the featured image from post content
  const getPostImage = (post: any) => {
    // First check if the post has a featureImage property
    if (post.featureImage) {
      return post.featureImage;
    }

    // Fallback: Try to extract the first image from the content
    if (post.content) {
      const imgMatch = post.content.match(/<img[^>]+src="([^">]+)"/i);
      return imgMatch ? imgMatch[1] : null;
    }

    return null;
  };

  // Function to create excerpt from content
  const createExcerpt = (content: string, maxLength = 120) => {
    if (!content) return "";

    // Remove HTML tags
    const textContent = content.replace(/<[^>]*>/g, "");

    // Truncate and add ellipsis if needed
    return textContent.length > maxLength
      ? `${textContent.substring(0, maxLength)}...`
      : textContent;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Posts</h1>
        {session?.user?.role !== "viewer" && (
          <Button onClick={handleNewPost}>
            <Plus className="mr-2 h-4 w-4" /> New Post
          </Button>
        )}
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center mb-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by author name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>

        {/* Add title search form */}
        <form onSubmit={handleTitleSearch} className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <FileText className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={titleSearch}
              onChange={(e) => setTitleSearch(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          <Button type="submit" variant="secondary" className="ml-2">
            Search
          </Button>
        </form>

        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-9 rounded-none rounded-l-md"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="h-9 rounded-none rounded-r-md"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Rest of the code - Table/Grid View */}
      
      {/* Add pagination controls at the bottom */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {posts.length > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0} to{" "}
            {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{" "}
            {pagination.total} posts
          </p>
          <Select
            value={pagination.limit.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!pagination.hasPreviousPage}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    No posts found.{" "}
                    {search || statusFilter !== "all"
                      ? "Try adjusting your filters."
                      : ""}
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(posts) &&
                posts.map((post) => (
                  <TableRow
                    key={post.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onDoubleClick={() => handleEdit(post.id)}
                  >
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      {getStatusBadge(post.status, true, post)}
                    </TableCell>
                    <TableCell>{post.author?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                        {post.updatedAt
                          ? formatDistanceToNow(new Date(post.updatedAt), {
                              addSuffix: true,
                            })
                          : "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(post.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {post.status === "PUBLISHED" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleView(post.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {(session?.user?.role === "admin" ||
                          session?.user?.role === "editor" ||
                          post.authorId === session?.user?.id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setPostToDelete(post.id);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <Card className="col-span-full py-10">
              <CardContent className="flex justify-center">
                Loading...
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card className="col-span-full py-10">
              <CardContent className="flex justify-center">
                No posts found.{" "}
                {search || statusFilter !== "all"
                  ? "Try adjusting your filters."
                  : ""}
              </CardContent>
            </Card>
          ) : (
            Array.isArray(posts) &&
            posts.map((post) => {
              const postImage = getPostImage(post);

              return (
                <Card
                  key={post.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-video w-full overflow-hidden">
                    {postImage ? (
                      <div className="h-48 w-full bg-gray-100 relative">
                        <Image
                          src={postImage}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            // Handle broken images
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-gray-100 flex items-center justify-center">
                        <FileText className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold line-clamp-1">
                        {post.title}
                      </CardTitle>
                      {getStatusBadge(post.status, true, post)}
                    </div>
                    <CardDescription className="flex items-center text-sm">
                      <Clock className="mr-1 h-3 w-3" />
                      {post.updatedAt
                        ? formatDistanceToNow(new Date(post.updatedAt), {
                            addSuffix: true,
                          })
                        : "Unknown"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {createExcerpt(post.content || "")}
                    </p>
                  </CardContent>

                  <CardFooter className="p-4 flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {post.author?.name || "Unknown"}
                    </div>
                    <div className="flex space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(post.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {post.status === "PUBLISHED" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(post.slug)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {(session?.user?.role === "admin" ||
                        session?.user?.role === "editor" ||
                        post.authorId === session?.user?.id) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setPostToDelete(post.id);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Post Status</AlertDialogTitle>
            <AlertDialogDescription>
              Change the status of &quot;{postToChangeStatus?.title}&quot;.
              {session?.user?.role === "author" &&
                " Note: As an author, you can only set posts to Draft or Published."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                {/* Only show archive option for editors and admins */}
                {(session?.user?.role === "admin" ||
                  session?.user?.role === "editor") && (
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>
              Update Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
