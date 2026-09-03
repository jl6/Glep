const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function generateCard(member, titleText) {
    const width = 1100;
    const height = 530;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const cardX = 0;
    const cardY = 0;
    const cardW = width;
    const cardH = height;
    const radius = 24;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = '#121522';
    ctx.fill();

    const borderGradient = ctx.createLinearGradient(0, 0, cardW, cardH);
    borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    borderGradient.addColorStop(0.5, 'rgba(88, 101, 242, 0.4)');
    borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.lineWidth = 2;
    ctx.strokeStyle = borderGradient;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText.toUpperCase(), cardW / 2, 65);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 95);
    ctx.lineTo(cardW - 40, 95);
    ctx.stroke();

    const avatarCenterX = 190;
    const avatarCenterY = 310;
    const avatarRadius = 105;

    const ringGradient = ctx.createLinearGradient(
        avatarCenterX - avatarRadius, 
        avatarCenterY - avatarRadius, 
        avatarCenterX + avatarRadius, 
        avatarCenterY + avatarRadius
    );
    ringGradient.addColorStop(0, '#5865f2');
    ringGradient.addColorStop(1, '#a2a8f8');

    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = ringGradient;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0c14';
    ctx.fill();

    try {
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatarImg = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();
    } catch (err) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AVATAR', avatarCenterX, avatarCenterY);
    }

    const infoX = 360;
    let currentY = 160;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(member.user.username, infoX, currentY);

    currentY += 36;
    ctx.fillStyle = '#818cf8';
    ctx.font = '24px sans-serif';
    const tag = member.user.discriminator && member.user.discriminator !== '0' 
        ? `@${member.user.username}#${member.user.discriminator}` 
        : `@${member.user.username}`;
    ctx.fillText(tag, infoX, currentY);

    currentY += 45;

    const stats = [
        { label: 'JOINED', value: member.joinedAt ? member.joinedAt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Unknown' },
        { label: 'JOIN POSITION', value: `#${member.guild ? member.guild.memberCount : 0}` },
        { label: 'MEMBER ID', value: member.id }
    ];

    const pillWidth = 680;
    const pillHeight = 52;
    const pillRadius = 12;

    stats.forEach((stat) => {
        ctx.beginPath();
        ctx.roundRect(infoX, currentY, pillWidth, pillHeight, pillRadius);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(stat.label, infoX + 20, currentY + 33);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '20px sans-serif';
        ctx.fillText(stat.value, infoX + 220, currentY + 33);

        currentY += 68;
    });

    return canvas.toBuffer('image/png');
}

module.exports = { generateCard };