import {useState, useEffect} from 'react';

interface Props {
  rulesCount: number;
}

export function AdminMetaobjectNotice({rulesCount}: Props) {
  const [isDevOrPreview, setIsDevOrPreview] = useState(false);

  useEffect(() => {
    // Only display on localhost, 127.0.0.1, or Shopify Oxygen preview URLs
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.includes('myshopify.com') ||
      host.includes('oxygen')
    ) {
      setIsDevOrPreview(true);
    }
  }, []);

  if (!isDevOrPreview || rulesCount > 0) return null;

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded">
            Admin Reminder
          </span>
          <span>
            No <strong>Device Brand Rules</strong> found. Configure entries in{' '}
            <strong className="text-white">
              Shopify Admin &gt; Content &gt; Metaobjects &gt; Device Brand Rule
            </strong>{' '}
            to categorize phone models and enable brand-level search.
          </span>
        </div>
      </div>
    </div>
  );
}
