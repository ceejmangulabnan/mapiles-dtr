<?php

namespace App\Enums;

enum UserStatus: string
{
    case Active = 'active';
    case Probation = 'probation';
    case Resigned = 'resigned';
    case Terminated = 'terminated';
    case Suspended = 'suspended';
    case Retired = 'retired';
};
