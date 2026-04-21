// 生成随机密码
export function generateRandomPassword(length: number = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 可用字符集
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters[randomIndex];
    }
    return password;
}

// 复制
export function copyTextToClipboard(text: string, callback: (bool: boolean) => void) {

    if (navigator.clipboard && window.ClipboardItem) {
        const blobPlainText = new Blob([text], { type: 'text/plain' });

        const clipboardItem = new ClipboardItem({
            'text/plain': blobPlainText,
        });
        navigator.clipboard.write([clipboardItem]).then(() => {
            callback(true);
        }).catch(err => {
            callback(false);
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;  // 复制纯文本

        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy'); // 执行复制
            callback(true);
        } catch (err) {
            callback(false);
        } finally {
            document.body.removeChild(textarea); // 清理
        }
    }

}

