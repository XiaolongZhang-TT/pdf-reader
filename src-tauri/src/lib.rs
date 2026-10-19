use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager, State};

/// Files that were handed to the app before the webview was ready to listen
/// (double-click in Finder, `open -a Paper file.pdf`, CLI arguments, …).
struct PendingFiles(Mutex<Vec<String>>);

/// Language used by the native menu (kept in sync with the frontend locale).
struct MenuLanguage(Mutex<String>);

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

fn normalize_language(locale: &str) -> &'static str {
    if locale.to_lowercase().starts_with("zh") {
        "zh"
    } else {
        "en"
    }
}

/// Translate a menu label without allocating; the language is either `zh` or
/// `en` after normalization.
fn tr(lang: &str, zh: &'static str, en: &'static str) -> &'static str {
    if lang == "zh" {
        zh
    } else {
        en
    }
}

/// Cross-platform native menu bar. Only platform-independent predefined items
/// are used (copy / paste / select all); everything else is a custom item so
/// the app also runs on Windows and Linux where some predefined items are
/// unsupported by the underlying menu implementation.
fn build_menu<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    lang: &str,
) -> tauri::Result<tauri::menu::Menu<R>> {
    let about_item =
        MenuItemBuilder::with_id("about", tr(lang, "关于 Paper", "About Paper")).build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", tr(lang, "退出 Paper", "Quit Paper"))
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

    #[cfg(target_os = "macos")]
    let app_menu = SubmenuBuilder::new(app, "Paper")
        .item(&about_item)
        .separator()
        .item(&PredefinedMenuItem::hide(
            app,
            Some(tr(lang, "隐藏 Paper", "Hide Paper")),
        )?)
        .item(&PredefinedMenuItem::hide_others(
            app,
            Some(tr(lang, "隐藏其他", "Hide Others")),
        )?)
        .item(&PredefinedMenuItem::show_all(
            app,
            Some(tr(lang, "显示全部", "Show All")),
        )?)
        .separator()
        .item(&quit_item)
        .build()?;

    #[cfg(not(target_os = "macos"))]
    let app_menu = SubmenuBuilder::new(app, "Paper")
        .item(&about_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let file_menu = SubmenuBuilder::new(app, tr(lang, "文件", "File"))
        .item(
            &MenuItemBuilder::with_id("open", tr(lang, "打开…", "Open…"))
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("close_document", tr(lang, "关闭文档", "Close Document"))
                .accelerator("CmdOrCtrl+Shift+W")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("close_window", tr(lang, "关闭窗口", "Close Window"))
                .accelerator("CmdOrCtrl+W")
                .build(app)?,
        )
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, tr(lang, "编辑", "Edit"))
        .item(
            &MenuItemBuilder::with_id("undo", tr(lang, "撤销", "Undo"))
                .accelerator("CmdOrCtrl+Z")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::copy(
            app,
            Some(tr(lang, "拷贝", "Copy")),
        )?)
        .item(&PredefinedMenuItem::paste(
            app,
            Some(tr(lang, "粘贴", "Paste")),
        )?)
        .item(&PredefinedMenuItem::select_all(
            app,
            Some(tr(lang, "全选", "Select All")),
        )?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, tr(lang, "显示", "View"))
        .item(
            &MenuItemBuilder::with_id("search", tr(lang, "搜索…", "Search…"))
                .accelerator("CmdOrCtrl+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("sidebar", tr(lang, "切换侧边栏", "Toggle Sidebar"))
                .accelerator("CmdOrCtrl+Alt+S")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("zoom_in", tr(lang, "放大", "Zoom In"))
                .accelerator("CmdOrCtrl+=")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom_out", tr(lang, "缩小", "Zoom Out"))
                .accelerator("CmdOrCtrl+-")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("actual_size", tr(lang, "实际大小", "Actual Size"))
                .accelerator("CmdOrCtrl+0")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("fit_width", tr(lang, "适合宽度", "Fit Width"))
                .accelerator("CmdOrCtrl+9")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("fit_page", tr(lang, "适合页面", "Fit Page"))
                .accelerator("CmdOrCtrl+8")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("rotate", tr(lang, "旋转 90°", "Rotate 90°")).build(app)?)
        .item(
            &MenuItemBuilder::with_id(
                "toggle_view",
                tr(lang, "连续 / 单页视图", "Continuous / Single Page"),
            )
            .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("cycle_theme", tr(lang, "切换外观", "Change Appearance"))
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id(
                "cycle_page_theme",
                tr(lang, "切换页面配色", "Change Page Theme"),
            )
            .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("fullscreen", tr(lang, "切换全屏", "Toggle Fullscreen"))
                .build(app)?,
        )
        .build()?;

    let window_menu = SubmenuBuilder::new(app, tr(lang, "窗口", "Window"))
        .item(&MenuItemBuilder::with_id("minimize", tr(lang, "最小化", "Minimize")).build(app)?)
        .item(&MenuItemBuilder::with_id("maximize", tr(lang, "缩放", "Zoom")).build(app)?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, tr(lang, "帮助", "Help"))
        .item(
            &MenuItemBuilder::with_id("shortcuts", tr(lang, "快捷键", "Keyboard Shortcuts"))
                .build(app)?,
        )
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

/// Rebuild the native menu when the webview UI language changes.
#[tauri::command]
fn set_menu_language(
    locale: String,
    app: tauri::AppHandle,
    state: State<'_, MenuLanguage>,
) -> Result<(), String> {
    let lang = normalize_language(&locale);
    *state.0.lock().unwrap() = lang.to_string();
    let menu = build_menu(&app, lang).map_err(|error| error.to_string())?;
    app.set_menu(menu).map_err(|error| error.to_string())?;
    Ok(())
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
        .manage(MenuLanguage(Mutex::new("zh".to_string())))
        .invoke_handler(tauri::generate_handler![
            read_file,
            log_frontend,
            take_pending_files,
            reveal_in_finder,
            set_menu_language
        ])
        .setup(|app| {
            let system_locale = sys_locale::get_locale().unwrap_or_else(|| "en".to_string());
            let lang = normalize_language(&system_locale);
            *app.state::<MenuLanguage>().0.lock().unwrap() = lang.to_string();

            let menu = build_menu(app.handle(), lang)?;
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
        // `app_handle` and `event` are only used in the macOS branch, but they
        // must stay named for the shared closure signature.
        #[cfg(not(target_os = "macos"))]
        {
            let _ = (&app_handle, &event);
        }

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
