'use client';

interface RawApiDisplayProps {
  data: any;
}

export default function RawApiDisplay({ data }: RawApiDisplayProps) {
  return (
    <div className="raw-api-display">
      <h3>Raw API Response</h3>
      <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
      <style jsx>{`
        .raw-api-display {
          margin-top: 20px;
          padding: 16px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          overflow: auto;
        }
        h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 16px;
          color: #495057;
        }
        pre {
          margin: 0;
          white-space: pre-wrap;
        }
        code {
          font-family: monospace;
          font-size: 14px;
          color: #212529;
        }
      `}</style>
    </div>
  );
} 