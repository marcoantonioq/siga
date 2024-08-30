const fetchWithCookies = async (request) => {
  try {
    request.credentials = "include";
    const response = await fetch(request.url, request);
    const text = await response.text(); // Trata a resposta como texto
    console.log("Fetch Response:", text);
    return { text }; // Retorna o texto como parte de um objeto
  } catch (error) {
    console.error("Error fetching data:", error);
    return { error: error.message };
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchData") {
    fetchWithCookies(request.url, request.body)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
