<template>
  <div>
    <v-card class="d-flex flex-column height-full mb-6">
      <error-banner :message="errorMessage"></error-banner>
      <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('containers.overviewGraph')}}</v-card-title>
      <v-progress-circular indeterminate v-if="loading" style="width: auto;"></v-progress-circular>
      <div ref="forcegraph" ></div>
    </v-card>
  </div>
</template>

<script lang="ts">

import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import ForceGraph, {ForceGraphInstance} from 'force-graph';
import {forceX, forceY, forceManyBody} from 'd3-force';
import {ContainerT, DataSourceT, TypeMappingT} from "@/api/types";
import buildURL from "build-url";
import Config from "@/config";

@Component({})
export default class OverviewGraph extends Vue {
  @Prop()
  readonly container!: ContainerT

  forceGraph: ForceGraphInstance | null = ForceGraph();
  canvas: ForceGraphInstance | null = null;
  forceX = forceX()
  forceY = forceY()
  graph: any | null = {
    nodes: [],
    links: []
  }
  linkCoords: Map<string, any> = new Map()
  loading = false
  nodeTextMargin = 6
  errorMessage = ''
  edgeID = 0
  normalFontSize = 5
  smallFontSize = 4
  largeFontSize = 6

  @Watch('container', {immediate: true})
  graphUpdate() {
    this.forceGraph = ForceGraph()

    this.$nextTick(() => {
      this.createContainerGraph();
    });
  }

  async createContainerGraph() {
    this.loading = true

    this.graph.nodes.push({
      uniqueID: this.container.id,
      nodeType: 'Container',
      ...this.container
    })

    const dataSources = await this.loadDataSources(false)
    const timeseriesDataSources = await this.loadDataSources(true)

    for (const dataSource of dataSources) {
      const nodeType = 'DataSource'
      const uniqueID = `${nodeType}_${dataSource.id}`
      const latestImport = await this.getDataSourceImportTime(dataSource.id!)

      const typeMappings = await this.getDataSourceTypeMappings(dataSource.id!)
      const typeMappingNode = await this.createTypeMappingNode(typeMappings, dataSource.id!)

      this.graph.nodes.push({
        uniqueID,
        nodeType,
        latestImport,
        ...dataSource
      })

      // add typeMappingNode and relationships
      if (typeMappingNode !== null) {
        this.graph.nodes.push(typeMappingNode)

        // data source to type mapping relationship
        this.graph.links.push({
          source: uniqueID,
          target: typeMappingNode.uniqueID,
          name: '',
          id: this.edgeID,
        })
        this.edgeID += 1

        // optional type mapping to container relationship
        if (latestImport !== 'Never') {
          this.graph.links.push({
            source: typeMappingNode.uniqueID,
            target: this.container.id,
            name: '',
            id: this.edgeID,
          })
          this.edgeID += 1
        }

      } else {
        // create relationship directly from data source to container or none at all
        if (latestImport !== 'Never') {
          this.graph.links.push({
            source: uniqueID,
            target: this.container.id,
            name: '',
            id: this.edgeID,
          })
          this.edgeID += 1
        }
      }

    }

    for (const dataSource of timeseriesDataSources) {
      const nodeType = 'TSDataSource'
      const uniqueID = `${nodeType}_${dataSource.id}`
      const rowCount = await this.getTimeseriesRowCount(dataSource.id!)
      const latestImport = await this.getDataSourceImportTime(dataSource.id!)

      this.graph.nodes.push({
        uniqueID,
        nodeType,
        rowCount,
        latestImport,
        ...dataSource
      })

      if (rowCount > 0 || latestImport !== 'Never') {
        this.graph.links.push({
          source: uniqueID,
          target: this.container.id,
          name: '',
          id: this.edgeID,
        })
        this.edgeID += 1
      }
    }

    this.drawGraph()
  }

  drawGraph() {
    const graphElem = this.$refs.forcegraph as HTMLElement;

    if (graphElem) {
      this.canvas = this.forceGraph!(graphElem)
          .width(graphElem.offsetWidth) // canvas width
          .height(700)
          .graphData(this.graph)
          .nodeLabel(() => {
            return ''
          }) // hide hover labels
          .nodeId('uniqueID')
          .nodeCanvasObject((node: any, ctx) => {
            const radius = 20

            ctx.beginPath()
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
            ctx.fillStyle = node.color;
            ctx.fill()

            const fontSize = this.normalFontSize;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#101020';

            const labels = this.determineNodeContent(node, fontSize);

            const maxWidth = radius * 2 - 2 // keep text inside the bounds of the node circle

            ctx.save()
            const x = node.x!

            for (let i = 0; i < labels.length; i++) {
              ctx.restore()
              ctx.save()
              ctx.translate(0, -10) // start above middle
              const y = node.y! + this.nodeTextMargin * i
              ctx.fillStyle = '#101020';
              ctx.font = `${labels[i].fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';

              if (this.canvas && labels[i].link) {
                ctx.fillStyle = '#131363'; // overwrite default styling for link
                let textWidth = ctx.measureText(labels[i].label).width // add manual text underline
                // ensure lines don't go outside of circle
                if (textWidth > maxWidth) textWidth = maxWidth
                ctx.fillRect(x - (textWidth / 2), y, textWidth, 0.5);

                const canvasCoords = this.canvas.graph2ScreenCoords(x, y - 12) // get coordinates that are valid for whole canvas
                this.updateCoords(labels[i].label, labels[i].link, canvasCoords.x, canvasCoords.y)
              }
              ctx.fillText(labels[i].label, x, y, maxWidth);
              ctx.restore()
            }

          })
          .nodeCanvasObjectMode(node => node ? 'after' : 'after')
          .nodeAutoColorBy((node: any) => {
            return `${node.nodeType}`
          })
          .nodeRelSize(1)
          .linkColor(() => '#363642')
          .linkCurvature('curvature')
          .linkDirectionalArrowLength(7)
          .linkDirectionalArrowRelPos(0.5)
          .linkLabel((link: any) => `${link.name}`)
          .linkWidth(4)
          .linkCanvasObjectMode(() => 'after')

      this.applyGraphForce()

      this.canvas.cooldownTime(2000) // set to a small render time
      this.canvas.onEngineStop(() => {
        // center and move to preset zoom for small graphs
        if (this.graph.nodes.length < 5) {
          this.canvas?.centerAt(this.graph.nodes[0].x, this.graph.nodes[0].y, 500)
          this.canvas?.zoom(5, 500)
          this.loading = false
        } else {
          this.canvas!.zoomToFit(500, 70, () => {
            this.loading = false
            return true
          })
        }
      })

      graphElem.addEventListener ('click', event => {
        const rect = (event.target! as HTMLCanvasElement).getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // check if click event is sufficiently close to any defined link
        this.linkCoords.forEach((linkValue) => {
          if(x > (linkValue.x - 50) && x <= (linkValue.x + 50) &&
              y > (linkValue.y - 7) && y < (linkValue.y + 7)) {
            window.open(linkValue.link)
          }
        })
      })
    }
  }

  applyGraphForce() {
    const manyBody = forceManyBody()
    manyBody.strength(-250)

    this.canvas!.graphData(this.graph) // this call is necessary to force the canvas to reheat

    this.canvas!.d3Force('charge', manyBody) // applies some distance between nodes
    this.canvas!.d3Force('link')!.distance(50) // apply link force for spacing
    this.canvas!.d3Force('x', this.forceX) // apply forces to keep nodes centered
    this.canvas!.d3Force('y', this.forceY)
  }

  determineNodeContent(node: any, defaultFontSize: number): any[] {
    if (node.nodeType === 'Container') {
      return [
        {label: this.$t('general.deepLynx'), fontSize: defaultFontSize},
        {label: `${node.name} (${node.id})`, fontSize: this.largeFontSize},
        {label: this.$t('query.viewer'), fontSize: this.smallFontSize, link: buildURL(Config.appUrl, {path: `/containers/${this.container?.id!}/data-query`})},
        {label: this.$t('modelExplorer.models3D'), fontSize: this.smallFontSize, link: buildURL(Config.appUrl, {path: `/containers/${this.container?.id!}/file-manager`})},
        {label: this.$t('ontology.ontology'), fontSize: this.smallFontSize, link: buildURL(Config.appUrl, {path: `/containers/${this.container?.id!}/metatypes`})}
      ]
    } else if (node.nodeType === 'DataSource') {
      return [
        {label: `${node.config.kind}`, fontSize: this.smallFontSize},
        {label: `${node.name} (${node.id})`, fontSize: defaultFontSize, link: buildURL(Config.appUrl, {path: `/containers/${this.container?.id!}/data-sources`})},
        {label: '', fontSize: 1},
        {label: `${this.$t('general.latest')}: ${node.latestImport}`, fontSize: this.smallFontSize},
      ]
    }  else if (node.nodeType === 'TSDataSource') {
      return [
        {label: `${node.config.kind}`, fontSize: this.smallFontSize},
        {label: `${node.name} (${node.id})`, fontSize: defaultFontSize, link: buildURL(Config.appUrl, {path: `/containers/${this.container?.id!}/data-sources`})},
        {label: '', fontSize: 1},
        {label: `${this.$t('general.latest')}: ${node.latestImport}`, fontSize: this.smallFontSize},
        {label: `${this.$t('general.rows')}: ${node.rowCount}`, fontSize: this.smallFontSize},
      ]
    }  else if (node.nodeType === 'TypeMapping') {
      const mappingText = node.count === 1 ? this.$t('typeMappings.mapping') : this.$t('typeMappings.mappings')
      let text = [
        {label: `${node.count} ${mappingText}`, fontSize: defaultFontSize, link: buildURL(Config.appUrl, {path: `/containers/${this.container?.id!}/data-mapping/${node.dataSourceID}`})},
        {label: '', fontSize: this.smallFontSize},
      ]
      if (node.needsTransformations) text.push({label: this.$t('typeMappings.needsTransformations') as string, fontSize: this.smallFontSize})
      text = text.concat([
          {label: `${node.metatypes.length} classes`, fontSize: this.smallFontSize},
          {label: `${node.relationshipPairs.length} relationships`, fontSize: this.smallFontSize}
      ])

      return text
    } else {
      return ['']
    }
  }

  updateCoords(label: string, link: string, x: number, y: number) {
    this.linkCoords.set(label, {x, y, link})
  }

  async loadDataSources(timeseries = false): Promise<DataSourceT[]> {
    return await this.$client.listDataSources(this.container.id, false, timeseries)
  }

  async getDataSourceImportTime(id: string): Promise<string> {
    let latestImportTime = new Date()
    const importList = await this.$client.listImports(this.container.id, id, {limit: 2000, offset: 0})
    if (importList.length > 0) {
      latestImportTime = new Date(importList[0].created_at)
    } else {
      return this.$t('general.never') as string
    }

    for (const eachImport of importList) {
      if (new Date(eachImport.created_at) > latestImportTime) latestImportTime = new Date(eachImport.created_at)
    }

    return latestImportTime.toLocaleString()
  }

  async getDataSourceTypeMappings(id: string): Promise<TypeMappingT[]> {
    let typeMappings = await this.$client.listTypeMappings(this.container.id, id, {limit: 2000, offset: 0})

    const transformations = []
    for(const mapping of typeMappings) {
      transformations.push(await this.$client.retrieveTransformations(this.container.id, id!, mapping.id))
    }

    for(const transformation of transformations) {
      transformation.map(t => {
        typeMappings = typeMappings.map(mapping => {
          if(!mapping.transformations) mapping.transformations = []

          if(mapping.id === t.type_mapping_id) {
            mapping.transformations.push(t)
          }

          return mapping
        })
      })
    }

    return typeMappings
  }

  async createTypeMappingNode(typeMappings: TypeMappingT[], id: string): Promise<any> {
    if (typeMappings.length > 0) {

      const metatypes = []
      const relationshipPairs = []

      // determine count and metatypes and relationships being created by these type mappings
      for (const mapping of typeMappings) {
        if (!mapping || !mapping.transformations) continue
        for (const transformation of mapping.transformations) {
          if (transformation.metatype_name) {
            metatypes.push(transformation.metatype_name)
          }

          if (transformation.metatype_relationship_pair_name) {
            relationshipPairs.push(transformation.metatype_relationship_pair_name)
          }
        }
      }

      // provide flag indicating data sources that have type mappings needing attention
      const blankMappingCount = await this.$client.countTypeMappings(this.container.id, id, true)

      return {
        uniqueID: `${typeMappings[0].id}_TypeMapping`,
        nodeType: 'TypeMapping',
        dataSourceID: id,
        count: typeMappings.length,
        needsTransformations: blankMappingCount === 0,
        metatypes,
        relationshipPairs,
      }
    } else {
      return null
    }
  }

  async getTimeseriesRowCount(id: string): Promise<number> {
    const rowCount = await this.$client.retrieveTimeseriesRowCount(this.container.id, id)
    return rowCount.count
  }

}
</script>
