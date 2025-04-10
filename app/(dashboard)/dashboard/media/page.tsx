'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MediaItem {
  id: string;
  url: string;
  type: string;
  alt?: string;
  createdAt: string;
  postId: string;
}

export default function MediaPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAltText, setEditAltText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/media');
      if (!response.ok) throw new Error('Failed to fetch media');
      const data = await response.json();
      setMediaItems(data);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: 'Error',
        description: 'Failed to load media items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', 'image');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const { url } = await response.json();
      
      // Save to the media collection
      const mediaResponse = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          type: 'image',
          alt: selectedFile.name,
        }),
      });
      
      if (!mediaResponse.ok) throw new Error('Failed to save media');
      
      toast({
        title: 'Success',
        description: 'Media uploaded successfully',
      });
      
      // Refresh the media list
      fetchMedia();
      
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload media',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setSelectedFile(null);
      // Reset the file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const confirmDelete = (media: MediaItem) => {
    setSelectedMedia(media);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedMedia) return;
    
    try {
      const response = await fetch(`/api/media/${selectedMedia.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete media');
      
      toast({
        title: 'Success',
        description: 'Media deleted successfully',
      });
      
      // Remove from local state
      setMediaItems(prevItems => prevItems.filter(item => item.id !== selectedMedia.id));
      setDeleteDialogOpen(false);
      
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete media',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (media: MediaItem) => {
    setSelectedMedia(media);
    setEditAltText(media.alt || '');
    setEditDialogOpen(true);
  };

  const handleUpdateAlt = async () => {
    if (!selectedMedia) return;
    
    try {
      const response = await fetch(`/api/media/${selectedMedia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt: editAltText }),
      });
      
      if (!response.ok) throw new Error('Failed to update media');
      
      toast({
        title: 'Success',
        description: 'Alt text updated successfully',
      });
      
      // Update in local state
      setMediaItems(prevItems => 
        prevItems.map(item => 
          item.id === selectedMedia.id ? { ...item, alt: editAltText } : item
        )
      );
      
      setEditDialogOpen(false);
      
    } catch (error) {
      console.error('Error updating media:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alt text',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Media Library</h1>
        <div className="flex items-center gap-3">
          {selectedFile && (
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Selected File'}
            </Button>
          )}
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*"
          />
          <label htmlFor="file-upload">
            <Button asChild variant="outline">
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Select Media
              </span>
            </Button>
          </label>
        </div>
      </div>

      {selectedFile && (
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm font-medium">Selected: {selectedFile.name}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <p className="text-muted-foreground">Loading media items...</p>
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="bg-muted p-6 rounded-md text-center">
          <p className="text-muted-foreground mb-2">No media items found</p>
          <p className="text-sm text-muted-foreground">Upload media to see it here</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {mediaItems.map((media) => (
            <Card key={media.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                <CardTitle className="text-sm font-medium truncate" title={media.alt || ''}>
                  {media.alt || 'No alt text'}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {media.type === 'image' ? (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <div className="rounded bg-primary h-4 w-4 flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">VID</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted">
                  {media.type === 'image' ? (
                    <div className="relative h-full w-full">
                      <Image 
                        src={media.url} 
                        alt={media.alt || 'Media item'} 
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <video 
                        src={media.url} 
                        controls 
                        className="max-h-full max-w-full"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-2 flex justify-between gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => openEditDialog(media)}
                  title="Edit alt text"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => window.open(media.url, '_blank')}
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => confirmDelete(media)}
                  className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this media item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2">
            {selectedMedia && selectedMedia.type === 'image' && (
              <div className="relative h-40 w-full rounded overflow-hidden">
                <Image
                  src={selectedMedia.url}
                  alt={selectedMedia.alt || 'Media to delete'}
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit alt text dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Alt Text</DialogTitle>
            <DialogDescription>
              Alt text helps describe images to users who can't see them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedMedia && selectedMedia.type === 'image' && (
              <div className="relative h-40 w-full rounded overflow-hidden">
                <Image
                  src={selectedMedia.url}
                  alt={selectedMedia.alt || 'Media to edit'}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <Input
                id="alt-text"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                placeholder="Describe the image content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAlt}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}