
// These are loaded from CDN in index.html
import { StorybookPage, StoryArchiveItem, PresentationSlide, StoryExtraction, GeneratedImage } from '../types';
import { Theme } from '../components/presentationThemes';
// Safely access global libraries
const jspdf = (typeof window !== 'undefined') ? (window as any).jspdf : undefined;

// Helper to split text into chunks of roughly N paragraphs
const splitNarrativeIntoChunks = (text: string, paragraphsPerChunk: number = 3): string[] => {
    if (!text) return [];
    // Ensure text is a string to prevent errors
    const safeText = String(text);
    const paragraphs = safeText.split('\n\n').filter(p => p.trim().length > 0);
    const chunks: string[] = [];
    
    for (let i = 0; i < paragraphs.length; i += paragraphsPerChunk) {
        chunks.push(paragraphs.slice(i, i + paragraphsPerChunk).join('\n\n'));
    }
    return chunks;
};

export const generatePages = (story: StoryArchiveItem): StorybookPage[] => {
    // Robust null check for the entire object
    if (!story || !story.narrative) return [];
    
    const pages: StorybookPage[] = [];
    const validImages = (story.generatedImages || []).filter(img => img.success && img.image_url);
    
    // SAFE TIMELINE ACCESS: Use optional chaining and ensure default array
    const timeline = [...(story?.extraction?.timeline || [])].sort((a, b) => {
         const yearA = parseInt(String(a.year), 10) || 0;
         const yearB = parseInt(String(b.year), 10) || 0;
         return yearA - yearB;
    });

    let imageIndex = 0;
    const getNextImage = () => {
        if (validImages.length === 0) return undefined;
        const img = validImages[imageIndex % validImages.length];
        imageIndex++;
        return img;
    };

    // 1. Title Page
    const titleImage = getNextImage();
    pages.push({
        title: typeof story.storytellerName === 'string' ? story.storytellerName : 'A Life Story',
        content: story.summary || story?.extraction?.summary || "A story of a life well-lived.",
        imageUrl: titleImage?.image_url,
        imagePrompt: titleImage?.prompt,
        provider: titleImage?.provider,
    });

    // 2. Narrative Weaving
    const narrativeChunks = splitNarrativeIntoChunks(story.narrative, 2);
    
    let timelineIndex = 0;

    narrativeChunks.forEach((chunk, index) => {
        const chunkImage = getNextImage();
        
        // Narrative Page
        pages.push({
            title: `Chapter ${index + 1}`,
            content: chunk,
            imageUrl: chunkImage?.image_url,
            imagePrompt: chunkImage?.prompt,
            provider: chunkImage?.provider,
        });

        // Interstitial Timeline Page (Context)
        if (timelineIndex < timeline.length) {
            const event = timeline[timelineIndex];
            const eventImage = getNextImage();
            
            pages.push({
                title: String(event.year || 'Unknown Time'),
                content: `**${String(event.event || 'Event')}**\n\n${String(event.significance || '')}`,
                imageUrl: eventImage?.image_url,
                imagePrompt: eventImage?.prompt,
                year: String(event.year) 
            });
            timelineIndex++;
        }
    });

    // 3. Remaining Timeline Events
    while (timelineIndex < timeline.length) {
         const event = timeline[timelineIndex];
         const eventImage = getNextImage();
         pages.push({
            title: `${String(event.year)}: ${String(event.event)}`,
            content: String(event.significance),
            imageUrl: eventImage?.image_url,
            year: String(event.year)
         });
         timelineIndex++;
    }
    
    // 4. Life Lessons
    if (story.extraction?.life_lessons && story.extraction.life_lessons.length > 0) {
         const lessonImage = getNextImage();
         const lessonsText = story.extraction.life_lessons.map(l => `• ${String(l)}`).join('\n\n');
         pages.push({
             title: "Wisdom & Lessons",
             content: lessonsText,
             imageUrl: lessonImage?.image_url
         });
    }

    // 5. Key Locations
    if (story.extraction?.locations && story.extraction.locations.length > 0) {
        const locText = story.extraction.locations.map(l => `📍 **${String(l.name)}** (${String(l.type)})`).join('\n');
        pages.push({
            title: "Places of Memory",
            content: locText,
        });
    }

    // 6. Video Finale
    if (story.videoUrl) {
        pages.push({
            title: "A Living Memory",
            content: "A cinematic moment from the story.",
            videoUrl: story.videoUrl,
        });
    }

    return pages;
};

export const exportStoryToPdf = async (pages: StorybookPage[], storyName: string) => {
    if (!jspdf) {
        console.error("jsPDF library is not loaded.");
        alert("Sorry, the PDF export feature is currently unavailable.");
        return;
    }

    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4'
        });

        const page_width = doc.internal.pageSize.getWidth();
        const page_height = doc.internal.pageSize.getHeight();
        const margin = 50;
        const max_width = page_width - margin * 2;
        let y = margin;
        
        const resetPage = () => {
            doc.addPage();
            y = margin;
        };

        const addText = (text: string, size: number, style: 'normal' | 'bold' = 'normal', align: 'left' | 'center' = 'left') => {
            doc.setFontSize(size);
            doc.setFont('helvetica', style);
            
            const cleanText = (text || '').replace(/\*\*/g, ''); 
            
            const lines = doc.splitTextToSize(cleanText || 'No content.', max_width);
            const text_height = lines.length * size * 1.15;

            if (y + text_height > page_height - margin) {
                resetPage();
            }
            
            doc.text(lines, align === 'center' ? page_width / 2 : margin, y, { align: align === 'center' ? 'center' : 'left' });
            y += text_height + (size / 2);
        };

        const addImage = async (imageUrl: string) => {
            const img_max_height = 300;
             if (y + img_max_height > page_height - margin) {
                resetPage();
            }

            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                const base64Image = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(blob);
                });

                const imgProps = doc.getImageProperties(base64Image);
                const ratio = imgProps.height / imgProps.width;
                let imgWidth = max_width * 0.85;
                let imgHeight = imgWidth * ratio;

                if(imgHeight > img_max_height) {
                    imgHeight = img_max_height;
                    imgWidth = imgHeight / ratio;
                }

                const x = (page_width - imgWidth) / 2;
                doc.addImage(base64Image, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');
                y += imgHeight + 30;

            } catch (e) {
                console.error("Could not add image to PDF:", e);
                addText("[Image could not be loaded]", 10, 'normal');
            }
        };

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (i > 0) resetPage();
            
            addText(page.title, i === 0 ? 32 : 24, 'bold', 'center');
            y += 20;

            if (page.imageUrl) await addImage(page.imageUrl);

            addText(page.content, 12, 'normal');
            
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`${i + 1}`, page_width / 2, page_height - 20, { align: 'center' });
            doc.setTextColor(0);
        }

        const safeFilename = storyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        doc.save(`${safeFilename}_storybook.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while creating the PDF.");
    }
};

export const exportPresentationToPdf = async (slides: PresentationSlide[], storyName: string, theme: Theme) => {
  if (!jspdf) {
    console.error("jsPDF library is not loaded.");
    alert("Sorry, the PDF export feature is currently unavailable.");
    return;
  }

  try {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const addImageToPdf = async (imageUrl: string, x: number, y: number, width: number, height: number) => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Image = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(blob);
        });
        doc.addImage(base64Image, 'JPEG', x, y, width, height, undefined, 'FAST');
      } catch (e) {
        console.error("Could not add image to PDF:", e);
        doc.text("[Image could not be loaded]", x + width/2, y + height/2, { align: 'center'});
      }
    };

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (i > 0) doc.addPage();
      
      doc.setFillColor(theme.pdf.bgColor);
      doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
      
      doc.setTextColor(theme.pdf.titleColor);
      doc.setFont('helvetica', 'bold');

      switch (slide.type) {
        case 'title':
          doc.setFontSize(48);
          doc.text(slide.title || '', doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2 - 20, { align: 'center' });
          doc.setFontSize(24);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(theme.pdf.textColor);
          doc.text(slide.subtitle || '', doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2 + 20, { align: 'center' });
          break;
        case 'content':
          doc.setFontSize(32);
          doc.text(slide.title || '', 50, 80);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(theme.pdf.textColor);
          if (Array.isArray(slide.content)) {
            slide.content.forEach((item, index) => {
              doc.text(`• ${item}`, 70, 140 + index * 30);
            });
          } else {
            doc.text(doc.splitTextToSize(slide.content || '', doc.internal.pageSize.width - 100), 50, 140);
          }
          break;
        case 'quote':
          doc.setFontSize(36);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(theme.pdf.textColor);
          doc.text(`"${slide.quote || ''}"`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, { align: 'center', maxWidth: doc.internal.pageSize.width - 100 });
          break;
        case 'image':
           if (slide.imageUrl) {
               await addImageToPdf(slide.imageUrl, 0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height);
           }
           if (slide.caption) {
               doc.setFillColor(0, 0, 0, 0.5);
               doc.rect(0, doc.internal.pageSize.height - 80, doc.internal.pageSize.width, 80, 'F');
               doc.setFontSize(18);
               doc.setTextColor(255, 255, 255);
               doc.text(slide.caption, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 40, { align: 'center' });
           }
          break;
        default:
          doc.setFontSize(32);
          doc.text(slide.title || 'Slide', 50, 80);
          break;
      }
    }

    const safeFilename = storyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeFilename}_presentation.pdf`);

  } catch (error) {
    console.error("Error generating Presentation PDF:", error);
    alert("An error occurred while creating the presentation PDF.");
  }
};
