use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager, State};

/// Files that were handed to the app before the webview was ready to listen
/// (double-click in Finder, `open -a Paper file.pdf`, CLI arguments, …).
struct PendingFiles(Mutex<Vec<String>>);

/// Page payload cache lives in the webview; Rust only streams raw bytes.
#[tauri::command]
fn read_file(path: String) -> Result<tauri::ipc::Response, String> {
    let p = std::path::PathBuf::from(&path);
    let meta = std::fs::metadata(&p).map_err(|e| format!("无法读取文件: {e}"))?;
    if !meta.is_file() {
        return Err("目标不是一个文件".into());
    }
    if meta.len() > 1024 * 1024 * 1024 {
        return Err("文件超过 1GB，暂不支持".into());
    }
    let bytes = std::fs::read(&p).map_err(|e| format!("无法读取文件: {e}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Dev-only diagnostics: lets the webview surface messages in the terminal,
/// which is otherwise hard to observe on macOS (no remote WebView console).
#[tauri::command]
fn log_frontend(message: String) {
    eprintln!("[paper-ui] {message}");
}

#[tauri::command]
fn take_pending_files(state: State<'_, PendingFiles>) -> Vec<String> {
    let mut lock = state.0.lock().unwrap();
    std::mem::take(&mut *lock)
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{path}"))
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let parent = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".into());
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Cross-platform native menu bar. Only platform-independent predefined items
/// are used (copy / paste / select all); everything else is a custom item so
/// the app also runs on Windows and Linux where some predefined items are
/// unsupported by the underlying menu implementation.
fn build_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<tauri::menu::Menu<R>> {
    let about_item = MenuItemBuilder::with_id("about", "关于 Paper").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "退出 Paper")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

    #[cfg(target_os = "macos")]
    let app_menu = SubmenuBuilder::new(app, "Paper")
        .item(&about_item)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("隐藏 Paper"))?)
        .item(&PredefinedMenuItem::hide_others(app, Some("隐藏其他"))?)
        .item(&PredefinedMenuItem::show_all(app, Some("显示全部"))?)
        .separator()
        .item(&quit_item)
        .build()?;

    #[cfg(not(target_os = "macos"))]
    let app_menu = SubmenuBuilder::new(app, "Paper")
        .item(&about_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "文件")
        .item(
            &MenuItemBuilder::with_id("open", "打开…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("close_document", "关闭文档")
                .accelerator("CmdOrCtrl+Shift+W")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("close_window", "关闭窗口")
                .accelerator("CmdOrCtrl+W")
                .build(app)?,
        )
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "编辑")
        .item(
            &MenuItemBuilder::with_id("undo", "撤销")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::copy(app, Some("拷贝"))?)
        .item(&PredefinedMenuItem::paste(app, Some("粘贴"))?)
        .item(&PredefinedMenuItem::select_all(app, Some("全选"))?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "显示")
        .item(
            &MenuItemBuilder::with_id("search", "搜索…")
                .accelerator("CmdOrCtrl+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("sidebar", "切换侧边栏")
                .accelerator("CmdOrCtrl+Alt+S")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("zoom_in", "放大")
                .accelerator("CmdOrCtrl+=")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom_out", "缩小")
                .accelerator("CmdOrCtrl+-")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("actual_size", "实际大小")
                .accelerator("CmdOrCtrl+0")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("fit_width", "适合宽度")
                .accelerator("CmdOrCtrl+9")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("fit_page", "适合页面")
                .accelerator("CmdOrCtrl+8")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("rotate", "旋转 90°").build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_view", "连续 / 单页视图").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("cycle_theme", "切换外观").build(app)?)
        .item(&MenuItemBuilder::with_id("cycle_page_theme", "切换页面配色").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("fullscreen", "切换全屏").build(app)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "窗口")
        .item(&MenuItemBuilder::with_id("minimize", "最小化").build(app)?)
        .item(&MenuItemBuilder::with_id("maximize", "缩放").build(app)?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "帮助")
        .item(&MenuItemBuilder::with_id("shortcuts", "快捷键").build(app)?)
        .build()?;

    MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ])
        .build()
}

fn collect_cli_files() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|arg| {
            let lower = arg.to_lowercase();
            lower.ends_with(".pdf") && std::path::Path::new(arg).is_file()
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PendingFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            read_file,
            log_frontend,
            take_pending_files,
            reveal_in_finder
        ])
        .setup(|app| {
            let menu = build_menu(&app.handle().clone())?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                let id = event.id().as_ref();
                match id {
                    "quit" => app.exit(0),
                    "close_window" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.close();
                        }
                    }
                    "minimize" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.minimize();
                        }
                    }
                    "maximize" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_maximized().unwrap_or(false) {
                                let _ = window.unmaximize();
                            } else {
                                let _ = window.maximize();
                            }
                        }
                    }
                    _ => {
                        let _ = app.emit("menu-action", id.to_string());
                    }
                }
            });
            let files = collect_cli_files();
            if !files.is_empty() {
                let state = app.state::<PendingFiles>();
                state.0.lock().unwrap().extend(files);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = &event {
            let mut files = Vec::new();
            for url in urls {
                if let Ok(p) = url.to_file_path() {
                    files.push(p.to_string_lossy().to_string());
                }
            }
            if !files.is_empty() {
                if let Some(state) = app_handle.try_state::<PendingFiles>() {
                    state.0.lock().unwrap().extend(files.clone());
                }
                let _ = app_handle.emit("open-file", files);
            }
        }
    });
}
