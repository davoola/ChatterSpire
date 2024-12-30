const { marked } = require('marked');
const hljs = require('highlight.js');
const emojiToolkit = require('emoji-toolkit');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 创建自定义渲染器
marked.use({
    gfm: true,
    breaks: true,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: true,
    xhtml: true,
    headerIds: false
});

// Markdown 解析函数
function parseMarkdown(text) {
    if (!text) return '';
    
    try {
        
        // 先处理 emoji
        const emojiText = emojiToolkit.shortnameToUnicode(text);
        
        // 解析 Markdown
        const html = marked.parse(emojiText, {
            gfm: true,
            breaks: true,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: true
        });
        
        // 净化 HTML
        const cleanHtml = DOMPurify.sanitize(html, {
            ADD_TAGS: ['input'],
            ADD_ATTR: ['checked', 'disabled', 'type']
        });
        
        return cleanHtml;
    } catch (err) {
        console.error('Markdown 解析错误:', err);
        return text;
    }
}

module.exports = parseMarkdown; 