# สแกนไดเรกทอรี
cargo run -- -path /path/to/repo

# สแกนไฟล์เฉพาะเจาะจง
cargo run -- -files "vuln.js,src/*.js"

# บันทึกผลเป็น JSON
cargo run -- -files "vuln.js" -json findings.json

# กรองตาม category
cargo run -- -path . -category vulnerability

# ซ่อน low severity
cargo run -- -path . -show-low false