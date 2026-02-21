/**
 * PHP source code for the WP Pilot REST API plugin.
 * Deployed via Code Snippets plugin on the WordPress site.
 *
 * Endpoints:
 *   GET  /wp-json/wp-pilot/v1/elementor/{post_id} — read widgets (flat)
 *   POST /wp-json/wp-pilot/v1/elementor/{post_id}/widget/{widget_id} — update widget
 *   GET  /wp-json/wp-pilot/v1/page-structure/{post_id} — hierarchical page layout
 *   POST /wp-json/wp-pilot/v1/clone-page — clone page with all Elementor data
 */

import { getElementorEndpoints } from "./php-elementor-endpoints";
import { getCloneEndpoints, getCloneHelpers } from "./php-clone-endpoints";

/** Returns the full PHP source for ALL WP Pilot REST endpoints */
export function getMuPluginContent(): string {
  return `<?php
/**
 * Plugin Name: WP Pilot — REST API
 * Description: Custom REST endpoints for reading/modifying Elementor data, cloning pages, and design audits.
 * Version: 2.0.0
 * Author: WP Pilot
 *
 * Security: All endpoints require edit_posts capability (Application Password auth).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'rest_api_init', function() {
${getElementorEndpoints()}
${getCloneEndpoints()}
} );

${getElementorHelpers()}
${getCloneHelpers()}
`;
}

/** PHP helper functions for Elementor read/write endpoints */
function getElementorHelpers(): string {
  return `
/**
 * GET handler: Parse _elementor_data and return flat widget list.
 */
function wppilot_get_elementor_data( WP_REST_Request \\$request ) {
    \\$post_id = (int) \\$request['post_id'];
    \\$post    = get_post( \\$post_id );

    if ( ! \\$post ) {
        return new WP_Error( 'post_not_found', 'Post not found.', array( 'status' => 404 ) );
    }

    \\$raw = get_post_meta( \\$post_id, '_elementor_data', true );
    if ( empty( \\$raw ) ) {
        return new WP_Error( 'no_elementor_data', 'This page has no Elementor data.', array( 'status' => 404 ) );
    }

    \\$data = json_decode( \\$raw, true );
    if ( ! is_array( \\$data ) ) {
        return new WP_Error( 'invalid_data', 'Elementor data is not valid JSON.', array( 'status' => 500 ) );
    }

    \\$widgets = wppilot_flatten_widgets( \\$data );

    return rest_ensure_response( array(
        'post_id'      => \\$post_id,
        'title'        => get_the_title( \\$post_id ),
        'widget_count' => count( \\$widgets ),
        'widgets'      => \\$widgets,
    ) );
}

/**
 * POST handler: Update a widget's settings in _elementor_data.
 */
function wppilot_update_elementor_widget( WP_REST_Request \\$request ) {
    \\$post_id   = (int) \\$request['post_id'];
    \\$widget_id = sanitize_text_field( \\$request['widget_id'] );
    \\$body      = \\$request->get_json_params();
    \\$settings  = isset( \\$body['settings'] ) ? \\$body['settings'] : array();

    if ( empty( \\$settings ) ) {
        return new WP_Error( 'no_settings', 'No settings provided.', array( 'status' => 400 ) );
    }

    \\$raw = get_post_meta( \\$post_id, '_elementor_data', true );
    if ( empty( \\$raw ) ) {
        return new WP_Error( 'no_elementor_data', 'This page has no Elementor data.', array( 'status' => 404 ) );
    }

    \\$data = json_decode( \\$raw, true );
    if ( ! is_array( \\$data ) ) {
        return new WP_Error( 'invalid_data', 'Elementor data is not valid JSON.', array( 'status' => 500 ) );
    }

    // Backup original data before modifying
    \\$backup_key = '_elementor_data_backup_' . time();
    update_post_meta( \\$post_id, \\$backup_key, \\$raw );

    // Find and update the widget
    \\$found = wppilot_update_widget_in_tree( \\$data, \\$widget_id, \\$settings );
    if ( ! \\$found ) {
        delete_post_meta( \\$post_id, \\$backup_key );
        return new WP_Error( 'widget_not_found', 'Widget not found.', array( 'status' => 404 ) );
    }

    // Write updated data back
    \\$new_raw = wp_json_encode( \\$data );
    update_post_meta( \\$post_id, '_elementor_data', wp_slash( \\$new_raw ) );

    // Clear Elementor CSS cache so changes render
    delete_post_meta( \\$post_id, '_elementor_css' );
    if ( class_exists( '\\\\Elementor\\\\Plugin' ) ) {
        \\\\Elementor\\\\Plugin::instance()->files_manager->clear_cache();
    }

    return rest_ensure_response( array(
        'success'          => true,
        'widget_id'        => \\$widget_id,
        'updated_settings' => \\$settings,
        'backup_key'       => \\$backup_key,
    ) );
}

/**
 * Recursively flatten Elementor's nested tree into widget list.
 */
function wppilot_flatten_widgets( \\$elements ) {
    \\$widgets = array();
    foreach ( \\$elements as \\$el ) {
        if ( isset( \\$el['elType'] ) && \\$el['elType'] === 'widget' && ! empty( \\$el['widgetType'] ) ) {
            \\$widgets[] = array(
                'id'         => \\$el['id'],
                'elType'     => \\$el['elType'],
                'widgetType' => \\$el['widgetType'],
                'settings'   => isset( \\$el['settings'] ) ? \\$el['settings'] : array(),
            );
        }
        if ( ! empty( \\$el['elements'] ) ) {
            \\$widgets = array_merge( \\$widgets, wppilot_flatten_widgets( \\$el['elements'] ) );
        }
    }
    return \\$widgets;
}

/**
 * Recursively find a widget by ID and merge new settings.
 */
function wppilot_update_widget_in_tree( &\\$elements, \\$widget_id, \\$new_settings ) {
    foreach ( \\$elements as &\\$el ) {
        if ( isset( \\$el['id'] ) && \\$el['id'] === \\$widget_id ) {
            if ( ! isset( \\$el['settings'] ) ) {
                \\$el['settings'] = array();
            }
            \\$el['settings'] = array_merge( \\$el['settings'], \\$new_settings );
            return true;
        }
        if ( ! empty( \\$el['elements'] ) ) {
            if ( wppilot_update_widget_in_tree( \\$el['elements'], \\$widget_id, \\$new_settings ) ) {
                return true;
            }
        }
    }
    return false;
}
`;
}
