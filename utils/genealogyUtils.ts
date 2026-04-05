import { StoryArchiveItem, StoryExtraction } from '../types';

const formatDateForGedcom = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // Check for just a year
            const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
            if(yearMatch) return yearMatch[0];
            return dateString.toUpperCase();
        }
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    } catch {
        return dateString.toUpperCase();
    }
};

const findEventData = (extraction: StoryExtraction | null, eventKeywords: string[]): { date: string | null; place: string | null } => {
    if (!extraction) return { date: null, place: null };

    const event = extraction.timeline.find(item => 
        eventKeywords.some(kw => item.event.toLowerCase().includes(kw))
    );
    
    if (event) {
        // Simple location extraction for now. A more robust solution would be needed for complex cases.
        const location = extraction.locations.find(loc => event.significance.includes(loc.name));
        return {
            date: event.year,
            place: location ? location.name : null
        };
    }

    return { date: null, place: null };
};


export const exportToGedcom = (story: StoryArchiveItem): void => {
    if(!story.extraction) {
        alert("Cannot export to GEDCOM: story extraction data is missing.");
        return;
    }
    
    const extraction = story.extraction;
    const mainPersonName = story.storytellerName.replace(/Story of |'s Story/gi, '').trim();

    let gedcomContent = `0 HEAD
1 SOUR Wissums
1 DATE ${formatDateForGedcom(new Date().toISOString())}
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
0 @I1@ INDI
1 NAME ${mainPersonName} /
`;
    // Birth
    const birthData = findEventData(extraction, ['birth', 'born', 'childhood']);
    if (birthData.date || birthData.place) {
        gedcomContent += '1 BIRT\n';
        if (birthData.date) gedcomContent += `2 DATE ${formatDateForGedcom(birthData.date)}\n`;
        if (birthData.place) gedcomContent += `2 PLAC ${birthData.place}\n`;
    }

    // Marriage
    const marriageData = findEventData(extraction, ['marriage', 'married', 'spouse', 'wedding']);
    if (marriageData.date || marriageData.place) {
        gedcomContent += '1 MARR\n';
        if (marriageData.date) gedcomContent += `2 DATE ${formatDateForGedcom(marriageData.date)}\n`;
        if (marriageData.place) gedcomContent += `2 PLAC ${marriageData.place}\n`;
    }
    
    // Notes from narrative and key quotes
    if (story.narrative) {
        gedcomContent += `1 NOTE ${story.narrative.replace(/\n/g, '\n2 CONT ')}\n`;
    }
    
    extraction.key_quotes.forEach(quote => {
        gedcomContent += `1 NOTE "Quote: ${quote.replace(/\n/g, '\n2 CONT ')}"\n`;
    });


    gedcomContent += '0 TRLR\n';

    const blob = new Blob([gedcomContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mainPersonName.replace(/ /g, '_')}_Genealogy.ged`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
