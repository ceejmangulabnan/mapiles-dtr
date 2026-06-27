<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Management = 'management';
    case Employee = 'employee';
};
