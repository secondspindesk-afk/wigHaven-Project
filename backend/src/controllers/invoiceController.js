import PDFDocument from 'pdfkit';
import { getPrisma } from '../config/database.js';

export const downloadInvoice = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const userId = req.user.id;
        const prisma = getPrisma();

        const order = await prisma.order.findUnique({
            where: { orderNumber },
            include: { items: true, user: true }
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (order.userId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // ================= CONFIGURATION =================
        const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

        const COLORS = {
            primary: '#000000',
            secondary: '#222222',
            text: '#444444',
            lightText: '#888888',
            accent: '#4ade80',
            line: '#e0e0e0',
            tableHeader: '#F9FAFB'
        };

        const formatCurrency = (amount) => `GHS ${parseFloat(amount).toFixed(2)}`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Wighaven_Invoice_${orderNumber}.pdf`);
        doc.pipe(res);

        // ================= HELPER FUNCTIONS =================

        const drawWatermark = () => {
            doc.save();
            doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
            doc.fontSize(100);
            doc.font('Helvetica-Bold');
            doc.fillColor(COLORS.primary);
            doc.opacity(0.10);
            doc.text('WIGHAVEN', 0, doc.page.height / 2 - 50, { align: 'center', width: doc.page.width });
            doc.restore();
        };

        const drawHeader = () => {
            doc.rect(0, 0, doc.page.width, 140).fill(COLORS.primary);

            doc.fillColor('#FFFFFF').fontSize(32).font('Helvetica-Bold')
                .text('WIGHAVEN', 50, 45, { characterSpacing: 3 });

            doc.fontSize(9).font('Helvetica').fillColor('#DDDDDD')
                .text('Premium Wig Collection', 50, 85)
                .text('Accra, Ghana', 50, 100)
                .text('support@wighaven.com | +233 55 123 4567', 50, 115);

            doc.fontSize(30).font('Helvetica-Bold').fillColor(COLORS.accent)
                .text('INVOICE', 0, 45, { align: 'right', width: 545 });

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
            doc.text('INVOICE #', 380, 90, { width: 70, align: 'left' })
                .text('DATE', 380, 108, { width: 70, align: 'left' });

            doc.font('Helvetica')
                .text(orderNumber, 450, 90, { align: 'right', width: 95 })
                .text(new Date(order.createdAt).toLocaleDateString('en-GB'), 450, 108, { align: 'right', width: 95 });
        };

        const drawTableHeader = (y) => {
            doc.rect(50, y, 500, 25).fill(COLORS.tableHeader);
            doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(9);
            doc.text('DESCRIPTION', 60, y + 8);
            doc.text('QTY', 300, y + 8, { width: 40, align: 'center' });
            doc.text('UNIT PRICE', 350, y + 8, { width: 90, align: 'right' });
            doc.text('TOTAL', 460, y + 8, { width: 80, align: 'right' });
        };

        // ================= DOCUMENT BODY =================

        drawWatermark();
        drawHeader();

        let yPos = 180;

        const drawAddressBox = (title, data, x, y) => {
            doc.lineWidth(1).strokeColor(COLORS.primary).moveTo(x, y).lineTo(x + 220, y).stroke();
            doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary).text(title.toUpperCase(), x, y + 10);
            doc.fontSize(10).font('Helvetica').fillColor(COLORS.text)
                .text(data.name, x, y + 28)
                .text(data.address || data.street, x, y + 43)
                .text(`${data.city}, ${data.state || ''}`, x, y + 58)
                .text(data.country, x, y + 73);
            if (data.phone) doc.fontSize(9).fillColor(COLORS.lightText).text(data.phone, x, y + 90);
        };

        const billTo = order.billingAddress || order.shippingAddress;
        drawAddressBox('Bill To', billTo, 50, yPos);
        drawAddressBox('Ship To', order.shippingAddress, 320, yPos);

        yPos = 310;
        drawTableHeader(yPos);
        yPos += 35;

        const colX = { desc: 60, qty: 300, price: 350, total: 460 };
        const colW = { desc: 230, qty: 40, price: 90, total: 80 };

        // ================= ITEMS WITH VARIANT DETAILS =================
        order.items.forEach((item) => {
            // Check for new page
            if (yPos > 680) {
                doc.addPage();
                drawWatermark();
                drawHeader();
                yPos = 180;
                drawTableHeader(yPos);
                yPos += 35;
            }

            // Product Name (Bold)
            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.secondary);
            doc.text(item.productName, colX.desc, yPos, { width: colW.desc });

            let lineOffset = 15;

            // Variant Details (color, length, texture, size)
            if (item.attributes) {
                const attrs = item.attributes;
                const variantDetails = [];

                if (attrs.color) variantDetails.push(`Color: ${attrs.color}`);
                if (attrs.length) variantDetails.push(`Length: ${attrs.length}`);
                if (attrs.texture) variantDetails.push(`Texture: ${attrs.texture}`);
                if (attrs.size) variantDetails.push(`Size: ${attrs.size}`);

                if (variantDetails.length > 0) {
                    const variantText = variantDetails.join(' • ');
                    doc.font('Helvetica').fontSize(8).fillColor(COLORS.lightText);
                    doc.text(variantText, colX.desc, yPos + lineOffset, { width: colW.desc });
                    lineOffset += 14;
                }
            }

            // SKU
            doc.font('Helvetica').fontSize(7).fillColor('#AAAAAA');
            doc.text(`SKU: ${item.variantSku}`, colX.desc, yPos + lineOffset, { width: colW.desc });

            // Quantity, Unit Price, Total (aligned to top)
            doc.font('Helvetica').fontSize(10).fillColor(COLORS.secondary);
            doc.text(item.quantity.toString(), colX.qty, yPos, { width: colW.qty, align: 'center' });
            doc.text(formatCurrency(item.unitPrice), colX.price, yPos, { width: colW.price, align: 'right' });
            doc.font('Helvetica-Bold').text(formatCurrency(item.subtotal), colX.total, yPos, { width: colW.total, align: 'right' });

            // Row height - increased for variant items
            const rowHeight = item.attributes ? 55 : 30;

            // Separator line
            doc.lineWidth(0.5).strokeColor(COLORS.line).moveTo(50, yPos + rowHeight - 5).lineTo(550, yPos + rowHeight - 5).stroke();

            yPos += rowHeight;
        });

        // ================= TOTALS =================
        if (yPos + 180 > doc.page.height - 50) {
            doc.addPage();
            drawWatermark();
            drawHeader();
            yPos = 180;
        }

        yPos += 15;
        const totalLabelX = 340;
        const totalValueX = 450;

        const drawTotalRow = (label, value, isGrandTotal = false) => {
            if (isGrandTotal) {
                doc.rect(totalLabelX - 10, yPos - 8, 220, 35).fill('#F0FDF4');
                doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(12);
                yPos += 5;
            } else {
                doc.fillColor(COLORS.text).font('Helvetica').fontSize(10);
            }
            doc.text(label, totalLabelX, yPos, { align: 'left' });
            doc.text(formatCurrency(value), totalValueX, yPos, { align: 'right', width: 90 });
            yPos += isGrandTotal ? 40 : 25;
        };

        drawTotalRow('Subtotal', order.subtotal);
        drawTotalRow('Shipping', order.shipping);
        if (order.tax > 0) drawTotalRow('Tax', order.tax);
        if (order.discount > 0) drawTotalRow('Discount', -order.discount);

        doc.lineWidth(1).strokeColor(COLORS.primary).moveTo(totalLabelX, yPos - 5).lineTo(550, yPos - 5).stroke();
        yPos += 5;
        drawTotalRow('TOTAL AMOUNT', order.total, true);

        // ================= SIGNATURE =================
        const signatureY = Math.max(yPos + 40, doc.page.height - 150);

        doc.lineWidth(1).strokeColor(COLORS.primary).moveTo(380, signatureY).lineTo(550, signatureY).stroke();
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary)
            .text('AUTHORIZED SIGNATORY', 380, signatureY + 10, { align: 'center', width: 170 });

        // ================= FOOTER =================
        doc.fontSize(7).font('Helvetica').fillColor('#999999')
            .text('Thank you for choosing Wighaven. No refunds on custom units.', 50, doc.page.height - 50, { align: 'center', width: 500 });

        doc.end();

    } catch (error) {
        console.error('Invoice generation error:', error);
        if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error' });
    }
};