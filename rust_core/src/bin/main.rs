use clap::Parser;
use std::fs;
use std::path::Path;

#[derive(Parser)]
#[command(name = "gabigabi")]
#[command(about = "ガビガビ画像生成ツール - 画像を意図的に劣化させて圧縮率を高めます")]
#[command(version)]
struct Args {
    /// 入力画像ファイル
    input_file: String,
    
    /// リサイズ率（パーセント）
    #[arg(short = 'r', long = "resize", default_value = "100.0")]
    resize_percent: f32,
    
    /// ガビガビレベル (1=軽微, 2=普通, 3=重め, 4=極重, 5=破壊)
    #[arg(short = 'g', long = "gabi", default_value = "2")]
    gabigabi_level: u8,
    
    /// 出力ファイルパス (省略時は自動生成)
    #[arg(short = 'o', long = "output")]
    output_file: Option<String>,
}

fn main() {
    let args = Args::parse();
    
    // Validate resize percentage
    if !(0.0 < args.resize_percent && args.resize_percent <= 100.0) {
        eprintln!("Error: リサイズ率は 0-100 の範囲で指定してください");
        std::process::exit(1);
    }
    
    // Validate gabigabi level
    if !(1..=5).contains(&args.gabigabi_level) {
        eprintln!("Error: ガビガビレベルは 1-5 の範囲で指定してください");
        std::process::exit(1);
    }
    
    // Read input image
    let input_data = match fs::read(&args.input_file) {
        Ok(data) => data,
        Err(e) => {
            eprintln!("Error: 入力ファイル '{}' が読み込めません: {}", args.input_file, e);
            std::process::exit(1);
        }
    };
    
    println!("ガビガビ化中 '{}' -> {}% (レベル {})...", 
             args.input_file, args.resize_percent, args.gabigabi_level);
    
    // Resize image with gabigabi effect
    let resized_data = match rust_core::resize_gabigabi(&input_data, args.resize_percent, args.gabigabi_level) {
        Ok(data) => data,
        Err(e) => {
            eprintln!("Error: ガビガビ化に失敗しました: {}", e);
            std::process::exit(1);
        }
    };
    
    // Generate output filename
    let output_path = if let Some(custom_output) = args.output_file {
        custom_output
    } else {
        let input_path_obj = Path::new(&args.input_file);
        let stem = input_path_obj.file_stem().unwrap().to_string_lossy();
        format!("{}_gabigabi_lv{}.jpg", stem, args.gabigabi_level)
    };
    
    // Write output image
    match fs::write(&output_path, &resized_data) {
        Ok(_) => {
            println!("✅ ガビガビ画像完成: {}", output_path);
            println!("   元サイズ: {} bytes", input_data.len());
            println!("   ガビガビ後: {} bytes", resized_data.len());
            println!("   圧縮率: {:.1}%", 
                    (1.0 - resized_data.len() as f32 / input_data.len() as f32) * 100.0);
        }
        Err(e) => {
            eprintln!("Error: 出力ファイル '{}' の保存に失敗しました: {}", output_path, e);
            std::process::exit(1);
        }
    }
} 