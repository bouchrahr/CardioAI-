import torch
import torch.nn as nn
import torch.nn.functional as F


class InceptionModule(nn.Module):
    def __init__(self, in_channels, nb_filters=64):
        super().__init__()
        self.conv10 = nn.Conv1d(in_channels, nb_filters, kernel_size=10, padding='same')
        self.conv20 = nn.Conv1d(in_channels, nb_filters, kernel_size=20, padding='same')
        self.conv40 = nn.Conv1d(in_channels, nb_filters, kernel_size=40, padding='same')
        self.maxpool = nn.MaxPool1d(kernel_size=3, stride=1, padding=1)
        self.conv_mp = nn.Conv1d(in_channels, nb_filters, kernel_size=1)
        self.bn = nn.BatchNorm1d(nb_filters * 4)
        self.relu = nn.ReLU()

    def forward(self, x):
        out = torch.cat([
            self.conv10(x),
            self.conv20(x),
            self.conv40(x),
            self.conv_mp(self.maxpool(x))
        ], dim=1)
        return self.relu(self.bn(out))


class SEBlock(nn.Module):
    def __init__(self, channels, reduction=16):
        super().__init__()
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction),
            nn.ReLU(),
            nn.Linear(channels // reduction, channels),
            nn.Sigmoid()
        )

    def forward(self, x):
        w = self.se(x).unsqueeze(-1)
        return x * w


class InceptionTimeSE(nn.Module):
    def __init__(self, num_classes=4, nb_filters=64):
        super().__init__()
        self.inc1 = InceptionModule(1, nb_filters)
        self.se1  = SEBlock(nb_filters * 4)
        self.inc2 = InceptionModule(nb_filters * 4, nb_filters)
        self.se2  = SEBlock(nb_filters * 4)
        self.inc3 = InceptionModule(nb_filters * 4, nb_filters)
        self.se3  = SEBlock(nb_filters * 4)
        self.residual = nn.Conv1d(1, nb_filters * 4, kernel_size=1)
        self.bn_res = nn.BatchNorm1d(nb_filters * 4)
        self.gap = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Sequential(
            nn.Linear(nb_filters * 4, 256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 128), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, 64), nn.ReLU(), nn.Dropout(0.1),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        res = F.relu(self.bn_res(self.residual(x)))
        x = self.se1(self.inc1(x))
        x = self.se2(self.inc2(x))
        x = self.se3(self.inc3(x))
        x = F.relu(x + res)
        x = self.gap(x).squeeze(-1)
        return self.fc(x)