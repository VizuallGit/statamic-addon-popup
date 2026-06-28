<?php

namespace Vizuall\Popup;

use Statamic\Providers\AddonServiceProvider as BaseAddonServiceProvider;

class AddonServiceProvider extends BaseAddonServiceProvider
{
    protected $scripts = [
        __DIR__.'/../resources/js/addon.js',
    ];
}
