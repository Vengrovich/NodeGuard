#!/bin/bash

echo "=== SSH RECOVERY SCRIPT START ==="

# 1. Проверка SSH сервиса
echo "[1] Checking SSH service..."
systemctl status ssh >/dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "SSH not running. Starting..."
    systemctl start ssh
fi

systemctl enable ssh

# 2. Принудительный перезапуск SSH
echo "[2] Restarting SSH..."
systemctl restart ssh

# 3. Исправление конфигурации SSH
echo "[3] Fixing sshd_config..."
SSHD_CONFIG="/etc/ssh/sshd_config"

sed -i 's/^#\?ListenAddress.*/ListenAddress 0.0.0.0/g' $SSHD_CONFIG

# если строки нет — добавим
grep -q "ListenAddress" $SSHD_CONFIG || echo "ListenAddress 0.0.0.0" >> $SSHD_CONFIG

systemctl restart ssh

# 4. Сброс firewall (iptables) 
echo "[4] Flushing iptables..."
iptables -F
iptables -t nat -F
iptables -X

# 5. Разрешаем SSH
echo "[5] Allowing SSH port 22..."
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 6. Проверка fail2ban
echo "[6] Checking fail2ban..."
if command -v fail2ban-client >/dev/null 2>&1; then
    echo "fail2ban detected, unbanning all..."
    fail2ban-client unban --all 2>/dev/null
fi

# 7. Проверка, слушает ли порт 22
echo "[7] Checking port 22..."
ss -tulnp | grep :22

# 8. Перезапуск Docker (на всякий случай)
echo "[8] Restarting Docker..."
systemctl restart docker

echo "=== SSH RECOVERY DONE ==="
echo "Try connecting again: ssh user@YOUR_IP"