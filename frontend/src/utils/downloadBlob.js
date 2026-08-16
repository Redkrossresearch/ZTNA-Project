/**
 * Triggers a browser file download from an axios blob response.
 * Used by the CSV export buttons in Admin User Management and
 * Admin Incident Management (GET .../export/users, .../export/incidents).
 */
const downloadBlob = (blobData, filename) => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default downloadBlob;
