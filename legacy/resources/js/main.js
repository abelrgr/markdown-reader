// #region Variables
var validExtensions = [
  "md",
  "mkd",
  "mdwn",
  "mdown",
  "mdtxt",
  "mdtext",
  "markdown",
  "text",
];

var recentFiles = [];
var storage = { recentFiles: [] };

// #region APP functions

// Function to get the recent files list from the storage
async function getStorage() {
  var data;
  try {
    var tmp = await Neutralino.storage.getData("recentFiles");
    data = JSON.parse(tmp);
  } catch (error) {
    await Neutralino.storage.setData(
      "recentFiles",
      JSON.stringify({ recentFiles: [] })
    );
    data = { recentFiles: [] };
  }

  recentFiles = data.recentFiles;

  var recentFilesListItem = document.getElementById("recentFilesList");

  recentFiles.forEach((file, index) => {
    var a = document.createElement("a");
    // a.classList.add("block px-4 py-2 text-sm text-gray-700 hover:bg-blue hover:text-white");
    a.classList.add(
      "block",
      "px-4",
      "py-2",
      "text-sm",
      "text-gray-700",
      "truncate",
      "hover:bg-blue",
      "hover:text-white"
    );
    a.innerHTML = file;
    a.href = "#";
    a.onclick = () => openRecentFile(file);
    recentFilesListItem.appendChild(a);
  });
}

// Function to update the recent files list in the storage
async function setStorage(item) {
  if (recentFiles.includes(item)) {
    recentFiles = recentFiles.filter((file) => file !== item);
  }

  recentFiles.unshift(item);
  recentFiles = recentFiles.slice(0, 5);

  await Neutralino.storage.setData(
    "recentFiles",
    JSON.stringify({ recentFiles })
  );
}

// Function to set the content of the drop zone to the parsed markdown content
function setMarkdownContent(content) {
  var dropZone = document.getElementById("dropZone");
  var markDown = marked.parse(content);
  dropZone.innerHTML = markDown;
}

// Function to open a recent file by reading its content and displaying it in the drop zone
async function openRecentFile(file) {
  var fileContent = await Neutralino.filesystem.readFile(file);

  if (fileContent) {
    setMarkdownContent(fileContent);
  }
}

// Function to open a file dialog and read the selected file's content
async function openFile() {
  var selectedFile = await Neutralino.os.showOpenDialog("Select a file", {
    filters: [{ name: "Markdown files", extensions: validExtensions }],
  });

  if (selectedFile[0]) {
    var fileContent = await Neutralino.filesystem.readFile(selectedFile[0]);

    if (fileContent) {
      setMarkdownContent(fileContent);
      setStorage(selectedFile[0]);
    }
  }
}

// /*
//     Function to set up a system tray menu with options specific to the window mode.
//     This function checks if the application is running in window mode, and if so,
//     it defines the tray menu items and sets up the tray accordingly.
// */
function setTray() {
  // Tray menu is only available in window mode
  if (NL_MODE != "window") {
    console.log("INFO: Tray menu is only available in the window mode.");
    return;
  }

  // Define tray menu items
  var tray = {
    icon: "/resources/icons/trayIcon.png",
    menuItems: [
      { id: "VERSION", text: "Get version" },
      { id: "SEP", text: "-" },
      { id: "QUIT", text: "Quit" },
    ],
  };

  // Set the tray menu
  Neutralino.os.setTray(tray);
}

/*
    Function to handle click events on the tray menu items.
    This function performs different actions based on the clicked item's ID,
    such as displaying version information or exiting the application.
*/
function onTrayMenuItemClicked(event) {
  switch (event.detail.id) {
    case "VERSION":
      // Display version information
      Neutralino.os.showMessageBox(
        "Version information",
        `Neutralinojs server: v${NL_VERSION} | Neutralinojs client: v${NL_CVERSION}`
      );
      break;
    case "QUIT":
      // Exit the application
      Neutralino.app.exit();
      break;
  }
}

// Function to handle the window close event by gracefully exiting the Neutralino application
function onWindowClose() {
  Neutralino.app.exit();
}

// Initialize Neutralino
Neutralino.init();

// Register event listeners
Neutralino.events.on("trayMenuItemClicked", onTrayMenuItemClicked);
Neutralino.events.on("windowClose", onWindowClose);

// Conditional initialization: Set up system tray if not running on macOS
if (NL_OS != "Darwin") {
  // TODO: Fix https://github.com/neutralinojs/neutralinojs/issues/615
  setTray();
}

getStorage();

// Add the event listener to the drop zone
document.addEventListener("DOMContentLoaded", () => {
  var dropZone = document.getElementById("dropZone");

  // Prevent default drag behaviors
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  dropZone.addEventListener("click", ($event) => {
    $event.preventDefault();
    $event.stopPropagation();

    if ($event.target.tagName === "A") {
      Neutralino.os.open($event.target.href);
    }
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => {
        dropZone.classList.add("hover");
      },
      false
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(
      eventName,
      () => {
        dropZone.classList.remove("hover");
      },
      false
    );
  });

  dropZone.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    var dt = e.dataTransfer;
    var files = dt.files;

    handleFiles(files);
  }

  function validateFile(file) {
    var extension = file.name.split(".").pop();
    return validExtensions.includes(extension);
  }

  function previewFile(file) {
    var filePath = file.path;
    console.log(filePath);

    var reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = () => {
      var markDown = marked.parse(reader.result);
      dropZone.innerHTML = markDown;
    };
  }

  function handleFiles(files) {
    files = [...files];
    files.forEach((file) => {
      var isValid = validateFile(file);
      if (isValid) {
        previewFile(file);
      }
    });
  }
});

// #region UI functions

async function setFooterInfo() {
  const cpuInfo = await Neutralino.computer.getCPUInfo();
  const osInfo = await Neutralino.computer.getOSInfo();
  const text = `CPU: ${cpuInfo.model.trim()} | OS: ${osInfo.description.trim()}`;

  const el = document.getElementById("system-info");

  setTimeout(() => {
    el.innerHTML = text;
  }, 2000);
}

function toggleMenu(menuId) {
  var menu = document.getElementById(menuId);
  var menus = document.querySelectorAll('[id$="-menu"]');
  menus.forEach(function (m) {
    if (m.id !== menuId) {
      m.classList.add("hidden");
    }
  });
  menu.classList.toggle("hidden");
}

function openModal() {
  var modal = document.getElementById("aboutModal");
  modal.classList.remove("hidden");
  document.getElementById("lastUpdated").textContent = "10/01/2024";
}

function closeModal() {
  var modal = document.getElementById("aboutModal");
  modal.classList.add("hidden");
}

window.onclick = function (event) {
  var modal = document.getElementById("aboutModal");
  if (event.target == modal) {
    closeModal();
  }
};

document.addEventListener("click", function (event) {
  if (!event.target.matches("button")) {
    var menus = document.querySelectorAll('[id$="-menu"]');
    menus.forEach(function (menu) {
      menu.classList.add("hidden");
    });
  }
});

setFooterInfo();
